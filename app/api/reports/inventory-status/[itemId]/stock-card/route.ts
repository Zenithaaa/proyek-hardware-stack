import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db"; // Pastikan path ini benar
import { z } from "zod";

const stockCardQuerySchema = z.object({
  startDate: z.string().datetime().optional(), // ISO 8601 date string
  endDate: z.string().datetime().optional(), // ISO 8601 date string
  // page: z.coerce.number().int().positive().optional().default(1),
  // limit: z.coerce.number().int().positive().optional().default(20),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const itemIdInt = parseInt(params.itemId);
    if (isNaN(itemIdInt)) {
      return NextResponse.json(
        { error: "Invalid item ID format" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const validatedQuery = stockCardQuerySchema.safeParse(queryParams);

    if (!validatedQuery.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters for stock card",
          details: validatedQuery.error.format(),
        },
        { status: 400 }
      );
    }

    const { startDate, endDate } = validatedQuery.data;

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    // 1. Fetch Sales Transactions (Stock Out)
    const salesMovements = await prisma.detailTransaksiPenjualan.findMany({
      where: {
        itemId: itemIdInt,
        transaksiPenjualan: {
          tanggalWaktuTransaksi:
            Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
          // Hanya ambil transaksi yang sudah selesai/valid untuk pergerakan stok
          // statusTransaksi: 'SELESAI', // Sesuaikan dengan status yang menandakan stok benar-benar keluar
        },
      },
      select: {
        transaksiPenjualan: {
          select: {
            nomorStruk: true,
            tanggalWaktuTransaksi: true,
          },
        },
        jumlah: true,
        hargaSaatTransaksi: true, // Harga jual saat itu
      },
      orderBy: {
        transaksiPenjualan: {
          tanggalWaktuTransaksi: "asc",
        },
      },
    });

    // 2. Fetch Goods Receipts (Stock In from Purchase)
    const purchaseReceiptMovements =
      await prisma.penerimaanBarangDetail.findMany({
        where: {
          itemId: itemIdInt,
          penerimaanBarangHeader: {
            tanggalPenerimaan:
              Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
            // statusPenerimaan: 'SELESAI_LENGKAP_PO', // atau status lain yang valid
          },
        },
        select: {
          penerimaanBarangHeader: {
            select: {
              nomorDokumen: true, // atau nomorSuratJalanSupplier
              tanggalPenerimaan: true,
            },
          },
          jumlahDiterima: true,
          hargaBeliSaatTerima: true,
        },
        orderBy: {
          penerimaanBarangHeader: {
            tanggalPenerimaan: "asc",
          },
        },
      });

    // 3. Fetch Stock Adjustments (Stock In/Out)
    const adjustmentMovements = await prisma.penyesuaianStok.findMany({
      where: {
        itemId: itemIdInt,
        tanggalPenyesuaian:
          Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
      },
      select: {
        id: true, // atau nomor dokumen jika ada
        tanggalPenyesuaian: true,
        jenisPenyesuaian: true, // 'MASUK' atau 'KELUAR'
        jumlah: true,
        alasan: true,
      },
      orderBy: {
        tanggalPenyesuaian: "asc",
      },
    });

    // Combine and sort all movements by date
    let combinedMovements: any[] = [];

    salesMovements.forEach((m) => {
      combinedMovements.push({
        tanggal: m.transaksiPenjualan.tanggalWaktuTransaksi,
        noReferensi: m.transaksiPenjualan.nomorStruk,
        jenisTransaksi: "Penjualan",
        kuantitasMasuk: null,
        kuantitasKeluar: m.jumlah,
        // harga: m.hargaSaatTransaksi // Bisa ditambahkan jika perlu
      });
    });

    purchaseReceiptMovements.forEach((m) => {
      combinedMovements.push({
        tanggal: m.penerimaanBarangHeader.tanggalPenerimaan,
        noReferensi: m.penerimaanBarangHeader.nomorDokumen, // atau nomorSuratJalanSupplier
        jenisTransaksi: "Pembelian (Penerimaan)",
        kuantitasMasuk: m.jumlahDiterima,
        kuantitasKeluar: null,
        // harga: m.hargaBeliSaatTerima // Bisa ditambahkan jika perlu
      });
    });

    adjustmentMovements.forEach((m) => {
      combinedMovements.push({
        tanggal: m.tanggalPenyesuaian,
        noReferensi: `ADJ-${m.id.substring(0, 8)}`, // Buat referensi singkat
        jenisTransaksi: `Penyesuaian ${
          m.jenisPenyesuaian === "MASUK" ? "Masuk" : "Keluar"
        }`,
        kuantitasMasuk: m.jenisPenyesuaian === "MASUK" ? m.jumlah : null,
        kuantitasKeluar: m.jenisPenyesuaian === "KELUAR" ? m.jumlah : null,
        // keterangan: m.alasan // Bisa ditambahkan
      });
    });

    combinedMovements.sort(
      (a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime()
    );

    // Calculate running balance
    // For an accurate starting balance, you'd need to fetch the item's stock before the startDate
    // or calculate from the beginning of time if no startDate is given.
    // This example assumes we start from 0 or a known initial stock if not calculating full history.
    // For simplicity, we'll just show movements. A true stock card needs an initial balance.

    // Fetch initial stock if needed for saldo awal, or assume it's handled by client based on current stock and reversing movements.
    // For now, saldo akhir dihitung per baris saja, bukan saldo berjalan yang akurat dari awal waktu.
    // Ini perlu perbaikan untuk saldo berjalan yang benar.
    let saldo = 0; // Ini harusnya saldo awal sebelum periode filter
    const movementsWithBalance = combinedMovements.map((m) => {
      if (m.kuantitasMasuk) saldo += m.kuantitasMasuk;
      if (m.kuantitasKeluar) saldo -= m.kuantitasKeluar;
      return {
        ...m,
        saldoAkhir: saldo,
        tanggal: new Date(m.tanggal).toISOString().split("T")[0],
      }; // Format tanggal
    });

    return NextResponse.json({ data: movementsWithBalance }, { status: 200 });
  } catch (error) {
    console.error(
      `Error fetching stock card for item ${params.itemId}:`,
      error
    );
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request payload", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch stock card" },
      { status: 500 }
    );
  }
}
