import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { prisma } from "@/lib/db";
import { createItemSchema } from "@/lib/schemas/item.schema";

// Fungsi untuk memvalidasi data Excel sebelum import
const validateExcelData = (data: any[]) => {
  const errors: string[] = [];
  const validData: any[] = [];

  data.forEach((row, index) => {
    try {
      // Transformasi data sesuai dengan skema
      const itemData = {
        nama: row.nama || "",
        kategoriId: row.kategoriId,
        hargaJual: row.hargaJual,
        hargaBeli: row.hargaBeli,
        stok: row.stok || 0,
        stokMinimum: row.stokMinimum,
        manufacture: row.manufacture,
        kodeBarcode: row.kodeBarcode,
        supplierId: row.supplierId,
        satuan: row.satuan || "Pcs",
      };

      // Validasi menggunakan Zod schema
      const validationResult = createItemSchema.safeParse(itemData);

      if (validationResult.success) {
        validData.push(validationResult.data);
      } else {
        errors.push(
          `Baris ${index + 1}: ${Object.values(
            validationResult.error.flatten().fieldErrors
          )
            .flat()
            .join(", ")}`
        );
      }
    } catch (error) {
      errors.push(`Baris ${index + 1}: Format data tidak valid`);
    }
  });

  return { validData, errors };
};

// Fungsi untuk mengimport data dari Excel
export const importFromExcel = async (file: File) => {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    // Validasi data
    const { validData, errors } = validateExcelData(jsonData);

    if (errors.length > 0) {
      return {
        success: false,
        errors,
        message: "Terdapat kesalahan dalam file Excel",
      };
    }

    // Import data yang valid ke database
    const importedItems = await prisma.$transaction(
      validData.map((item) =>
        prisma.item.create({
          data: item,
        })
      )
    );

    return {
      success: true,
      message: `Berhasil mengimport ${importedItems.length} item`,
      data: importedItems,
    };
  } catch (error) {
    console.error("Error importing Excel:", error);
    return {
      success: false,
      message: "Gagal mengimport file Excel",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

// Fungsi untuk mengexport data ke Excel
import { TransaksiPenjualan } from "@/app/(app)/reports/sales-summary/page";
import { format } from "date-fns";

export const exportToExcel = async (transactions: TransaksiPenjualan[]) => {
  try {
    const excelData = transactions.map((tx) => ({
      "No. Struk": tx.nomorStruk,
      "Tanggal & Waktu": format(
        new Date(tx.tanggalWaktuTransaksi),
        "yyyy-MM-dd HH:mm"
      ),
      "Nama Barang": tx.detailTransaksiPenjualan
        .map((detail) => detail.item.nama)
        .join(", "),
      "Kategori Barang": tx.detailTransaksiPenjualan
        .map((detail) => detail.item.kategori.nama)
        .join(", "),
      Pelanggan: tx.pelanggan?.nama || "Umum",
      Kasir: tx.userId, // TODO: Fetch actual cashier name
      "Metode Pembayaran": tx.pembayaranTransaksi[0]?.metodePembayaran || "-",
      Subtotal: tx.subtotalSebelumDiskonPajak,
      Diskon: tx.totalDiskonTransaksi || 0,
      Pajak: tx.totalPajak || 0,
      "Biaya Kirim": tx.biayaPengiriman || 0,
      "Grand Total": tx.grandTotal,
      Status: tx.statusTransaksi,
    }));

    // Buat workbook dan worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Tambahkan worksheet ke workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventaris");

    // Generate file Excel
    const excelBuffer = XLSX.write(workbook, {
      type: "array",
      bookType: "xlsx",
    });
    if (!excelBuffer || !(excelBuffer instanceof ArrayBuffer)) {
      throw new Error("Gagal membuat file Excel");
    }
    return new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  } catch (error) {
    console.error("Error exporting to Excel:", error);
    throw new Error(
      error instanceof Error ? error.message : "Gagal mengexport ke Excel"
    );
  }
};

// Fungsi untuk mengexport data ke PDF
export const exportToPDF = async () => {
  try {
    // Ambil semua data item dengan relasi
    const items = await prisma.item.findMany({
      include: {
        kategori: true,
        supplier: true,
      },
    });

    // Buat dokumen PDF dengan tipe yang benar
    const doc = new jsPDF();

    // Tambahkan judul
    doc.setFontSize(16);
    doc.text("Laporan Inventaris", 14, 15);

    // Format data untuk tabel PDF
    const tableData = items.map((item) => [
      item.kodeBarcode || "-",
      item.nama,
      item.kategori?.nama || "-",
      new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
      }).format(Number(item.hargaJual)),
      item.stok.toString(),
      item.satuan || "Pcs",
    ]);

    // Tambahkan tabel ke PDF menggunakan tipe yang benar
    autoTable(doc, {
      head: [
        ["Barcode", "Nama Barang", "Kategori", "Harga Jual", "Stok", "Satuan"],
      ],
      body: tableData,
      startY: 25,
      theme: "grid",
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      alternateRowStyles: { fillColor: [242, 242, 242] },
    });

    // Generate file PDF
    const pdfBlob = doc.output("blob");
    if (!pdfBlob || !(pdfBlob instanceof Blob)) {
      throw new Error("Gagal membuat file PDF");
    }
    return pdfBlob;
  } catch (error) {
    console.error("Error exporting to PDF:", error);
    throw new Error(
      error instanceof Error ? error.message : "Gagal mengexport ke PDF"
    );
  }
};
