"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";

// Schema untuk validasi data penyesuaian stok
const stockAdjustmentSchema = z.object({
  itemId: z.number({
    required_error: "ID barang harus diisi",
  }),
  tanggal: z.date({
    required_error: "Tanggal penyesuaian harus diisi",
  }),
  nomorReferensi: z.string().optional(),
  jenisPenyesuaian: z.string({
    required_error: "Jenis penyesuaian harus dipilih",
  }),
  tipeOperasi: z
    .enum(["Tambah", "Kurang"], {
      required_error: "Tipe operasi harus dipilih",
    })
    .optional(), // Opsional untuk Stok Opname
  jumlah: z
    .number({
      required_error: "Jumlah harus diisi",
    })
    .min(1, "Jumlah minimal 1"),
  stokFisikBaru: z.number().optional(), // Untuk Stok Opname
  keterangan: z.string().optional(),
  userId: z.number({
    required_error: "ID pengguna harus diisi",
  }),
});

type StockAdjustmentData = z.infer<typeof stockAdjustmentSchema>;

type StockAdjustmentData = z.infer<typeof stockAdjustmentSchema>;

/**
 * Action untuk membuat penyesuaian stok baru
 */
export async function createStockAdjustmentAction(data: StockAdjustmentData) {
  try {
    // Validasi data input
    const validatedData = stockAdjustmentSchema.parse(data);

    // Ambil data item untuk mendapatkan stok saat ini
    const item = await prisma.item.findUnique({
      where: { id: validatedData.itemId },
    });

    if (!item) {
      return {
        success: false,
        message: "Barang tidak ditemukan.",
      };
    }

    const stokSebelum = item.stok;
    let stokSesudah = stokSebelum;
    let tipeOperasi = validatedData.tipeOperasi;
    let jumlah = validatedData.jumlah;

    // Kasus khusus untuk Stok Opname
    if (
      validatedData.jenisPenyesuaian === "Stok Opname" &&
      validatedData.stokFisikBaru !== undefined
    ) {
      // Gunakan stok fisik baru sebagai stok sesudah
      stokSesudah = validatedData.stokFisikBaru;

      // Hitung perubahan stok
      const perubahan = stokSesudah - stokSebelum;

      // Tentukan tipe operasi berdasarkan perubahan
      if (perubahan > 0) {
        tipeOperasi = "Tambah";
      } else if (perubahan < 0) {
        tipeOperasi = "Kurang";
      } else {
        // Jika tidak ada perubahan, tetap catat sebagai penyesuaian tanpa perubahan
        tipeOperasi = "Tambah"; // Default untuk kasus tidak ada perubahan
      }

      // Simpan jumlah absolut dari perubahan
      jumlah = Math.abs(perubahan);
    }
    // Kasus normal (bukan Stok Opname)
    else if (tipeOperasi === "Tambah") {
      stokSesudah = stokSebelum + jumlah;
    } else if (tipeOperasi === "Kurang") {
      stokSesudah = Math.max(0, stokSebelum - jumlah);
    }

    // Gunakan transaksi untuk memastikan konsistensi data
    const result = await prisma.$transaction(async (tx) => {
      // 1. Buat record penyesuaian stok
      const penyesuaian = await tx.penyesuaianStok.create({
        data: {
          itemId: validatedData.itemId,
          userId: validatedData.userId,
          tanggal: validatedData.tanggal,
          jenisPenyesuaian: validatedData.jenisPenyesuaian,
          tipeOperasi: tipeOperasi,
          jumlah: jumlah,
          stokSebelum: stokSebelum,
          stokSesudah: stokSesudah,
          keterangan: validatedData.keterangan,
          nomorReferensi: validatedData.nomorReferensi,
        },
      });

      // 2. Update stok item
      const updatedItem = await tx.item.update({
        where: { id: validatedData.itemId },
        data: { stok: stokSesudah },
      });

      return { penyesuaian, updatedItem };
    });

    // Revalidasi path terkait
    revalidatePath("/inventory/stock-adjustments");
    revalidatePath("/inventory/items");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: "Penyesuaian stok berhasil disimpan.",
      data: result.penyesuaian,
    };
  } catch (error) {
    console.error("Error creating stock adjustment:", error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        message:
          "Validasi data gagal: " +
          error.errors.map((e) => e.message).join(", "),
      };
    }
    return {
      success: false,
      message: "Terjadi kesalahan saat menyimpan penyesuaian stok.",
    };
  }
}

/**
 * Action untuk mengambil daftar penyesuaian stok dengan filter
 */
export async function getStockAdjustmentsAction({
  page = 1,
  limit = 10,
  searchQuery = "",
  startDate,
  endDate,
  jenisPenyesuaian,
  userId,
}: {
  page?: number;
  limit?: number;
  searchQuery?: string;
  startDate?: Date;
  endDate?: Date;
  jenisPenyesuaian?: string;
  userId?: number;
}) {
  try {
    // Buat filter berdasarkan parameter
    const where: any = {};

    // Filter berdasarkan rentang tanggal
    if (startDate || endDate) {
      where.tanggal = {};
      if (startDate) {
        where.tanggal.gte = startDate;
      }
      if (endDate) {
        // Tambahkan 1 hari ke endDate untuk mencakup seluruh hari
        const nextDay = new Date(endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        where.tanggal.lt = nextDay;
      }
    }

    // Filter berdasarkan jenis penyesuaian
    if (jenisPenyesuaian) {
      where.jenisPenyesuaian = jenisPenyesuaian;
    }

    // Filter berdasarkan user
    if (userId) {
      where.userId = userId;
    }

    // Filter berdasarkan pencarian (nama item atau nomor referensi)
    if (searchQuery) {
      where.OR = [
        {
          item: {
            nama: {
              contains: searchQuery,
              mode: "insensitive",
            },
          },
        },
        {
          nomorReferensi: {
            contains: searchQuery,
            mode: "insensitive",
          },
        },
      ];
    }

    // Hitung total data untuk paginasi
    const totalCount = await prisma.penyesuaianStok.count({ where });

    // Ambil data penyesuaian stok dengan paginasi
    const adjustments = await prisma.penyesuaianStok.findMany({
      where,
      include: {
        item: {
          select: {
            nama: true,
            kodeBarcode: true,
          },
        },
      },
      orderBy: {
        tanggal: "desc",
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      success: true,
      data: adjustments,
      meta: {
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  } catch (error) {
    console.error("Error fetching stock adjustments:", error);
    return {
      success: false,
      message: "Terjadi kesalahan saat mengambil data penyesuaian stok.",
    };
  }
}
