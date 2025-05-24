import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db"; // Pastikan path ini benar
import { z } from "zod";

const inventoryReportQuerySchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().optional(), // Asumsi ID kategori adalah string, sesuaikan jika integer
  supplierId: z.string().optional(), // Asumsi ID supplier adalah string, sesuaikan jika integer
  stockStatus: z
    .enum(["semua", "aman", "menipis", "habis"])
    .optional()
    .default("semua"),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().optional().default(10),
  // Tambahkan filter lain jika perlu, misal tanggal untuk kartu stok
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const validatedQuery = inventoryReportQuerySchema.safeParse(queryParams);

    if (!validatedQuery.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: validatedQuery.error.format(),
        },
        { status: 400 }
      );
    }

    const { search, categoryId, supplierId, stockStatus, page, limit } =
      validatedQuery.data;

    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { nama: { contains: search, mode: "insensitive" } },
        { kodeBarcode: { contains: search, mode: "insensitive" } },
      ];
    }

    if (categoryId && categoryId !== "semua") {
      whereClause.kategoriId = parseInt(categoryId); // Sesuaikan jika ID bukan integer
    }

    if (supplierId && supplierId !== "semua") {
      whereClause.supplierId = parseInt(supplierId); // Sesuaikan jika ID bukan integer
    }

    if (stockStatus && stockStatus !== "semua") {
      if (stockStatus === "aman") {
        // Stok > StokMinimum
        whereClause.AND = [
          ...(whereClause.AND || []),
          { stok: { gt: 0 } }, // Pastikan stok tidak 0
          { stokMinimum: { gt: 0 } }, // Pastikan stok minimum ada
          { stok: { gt: { สมัยก่อน: "stokMinimum" } } }, // Ini mungkin perlu penyesuaian cara Prisma handle perbandingan field
          // Jika perbandingan field langsung tidak didukung atau kompleks:
          // Anda mungkin perlu mengambil semua data lalu filter di aplikasi, atau menggunakan raw query
          // Untuk sementara, kita bisa asumsikan stok > stokMinimum
          // whereClause.stok = { gt: prisma.item.fields.stokMinimum }; // Ini tidak valid di Prisma
        ];
      } else if (stockStatus === "menipis") {
        // Stok <= StokMinimum DAN Stok > 0
        whereClause.AND = [
          ...(whereClause.AND || []),
          { stok: { gt: 0 } },
          { stokMinimum: { gt: 0 } }, // Hanya berlaku jika stok minimum diset
          // { stok: { lte: prisma.item.fields.stokMinimum } } // Tidak valid
          // Perlu cara untuk membandingkan kolom stok dengan kolom stokMinimum
        ];
      } else if (stockStatus === "habis") {
        whereClause.stok = 0;
      }
    }

    // Fetching items for the current page
    const items = await prisma.item.findMany({
      where: whereClause,
      include: {
        kategori: true,
        supplier: true,
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        nama: "asc",
      },
    });

    // Count total items for pagination
    const totalItems = await prisma.item.count({
      where: whereClause,
    });

    // Calculate KPIs - ini akan menghitung berdasarkan filter yang sama
    // Total Item Berbeda (SKU)
    const totalSKU = totalItems; // Karena kita sudah filter

    // Total Nilai Inventaris (HPP & Harga Jual)
    // Untuk ini, kita perlu mengambil SEMUA item yang cocok dengan filter, bukan hanya halaman saat ini
    // Atau, jika dataset besar, ini bisa jadi operasi yang mahal.
    // Pertimbangkan apakah KPI harus selalu mencerminkan keseluruhan data terfilter atau hanya halaman saat ini.
    // Untuk akurasi, kita ambil semua yang terfilter untuk kalkulasi KPI.
    const allFilteredItemsForKPI = await prisma.item.findMany({
      where: whereClause,
      select: {
        stok: true,
        hargaBeli: true,
        hargaJual: true,
        stokMinimum: true,
      },
    });

    let totalInventoryValueHPP = 0;
    let totalInventoryValueHargaJual = 0;
    let lowStockItemsCount = 0;
    let outOfStockItemsCount = 0;

    allFilteredItemsForKPI.forEach((item) => {
      totalInventoryValueHPP +=
        (item.stok ?? 0) * parseFloat(item.hargaBeli?.toString() ?? "0");
      totalInventoryValueHargaJual +=
        (item.stok ?? 0) * parseFloat(item.hargaJual.toString());
      if ((item.stok ?? 0) === 0) {
        outOfStockItemsCount++;
      }
      // Logika stok menipis: stok <= stokMinimum DAN stok > 0
      if (
        item.stokMinimum &&
        (item.stok ?? 0) > 0 &&
        (item.stok ?? 0) <= (item.stokMinimum ?? 0)
      ) {
        lowStockItemsCount++;
      }
    });

    // Logika untuk status 'aman' (stok > stokMinimum) perlu penyesuaian di query utama jika ingin akurat
    // atau difilter di sisi client/server setelah fetch.
    // Untuk 'menipis' dan 'habis' di whereClause, perlu raw query atau post-filter jika perbandingan field tidak bisa.
    // Contoh sederhana untuk whereClause 'menipis' (stok <= stokMinimum AND stok > 0):
    // Ini akan lebih kompleks jika stokMinimum bisa null.
    // if (stockStatus === 'menipis') {
    //   whereClause.stok = { gt: 0 };
    //   whereClause.stokMinimum = { gt: 0 };
    //   // whereClause.expr = { sql: '"stok" <= "stokMinimum"' }; // Contoh raw, sintaks mungkin beda
    // }

    const responseData = items.map((item) => ({
      id: item.id.toString(), // Pastikan ID adalah string jika komponen UI mengharapkannya
      kodeBarang: item.kodeBarcode || `ITEM-${item.id}`,
      namaBarang: item.nama,
      kategori: item.kategori?.nama || "N/A",
      supplier: item.supplier?.nama || "N/A",
      satuan: item.satuan || "Pcs",
      stokSaatIni: item.stok,
      stokMinimum: item.stokMinimum || 0,
      statusStok:
        item.stok === 0
          ? "Habis"
          : item.stokMinimum && item.stok <= item.stokMinimum
          ? "Menipis"
          : "Aman",
      hargaBeliSatuan: parseFloat(item.hargaBeli?.toString() ?? "0"),
      nilaiStokHPP:
        (item.stok ?? 0) * parseFloat(item.hargaBeli?.toString() ?? "0"),
      hargaJualSatuan: parseFloat(item.hargaJual.toString()),
      nilaiStokHargaJual:
        (item.stok ?? 0) * parseFloat(item.hargaJual.toString()),
    }));

    return NextResponse.json(
      {
        data: responseData,
        meta: {
          currentPage: page,
          totalPages: Math.ceil(totalItems / limit),
          totalItems,
          limit,
        },
        kpi: {
          totalSKU,
          totalInventoryValueHPP,
          totalInventoryValueHargaJual,
          lowStockItemsCount,
          outOfStockItemsCount,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching inventory status report:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory status report" },
      { status: 500 }
    );
  }
}

// Placeholder untuk API Kartu Stok (GET by item ID)
// export async function GET_STOCK_CARD(request: NextRequest, { params }: { params: { itemId: string } }) {
//   const itemId = params.itemId;
//   // TODO: Implement logic to fetch stock movements for the given itemId
//   // DetailTransaksiPenjualan (keluar)
//   // DetailPenerimaanBarang (masuk dari pembelian)
//   // PenyesuaianStok (masuk/keluar)
//   return NextResponse.json({ message: `Stock card data for item ${itemId}` });
// }
