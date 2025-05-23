"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  supplierSchema,
  type SupplierFormValues,
} from "@/lib/schemas/supplier.schema";
import { Prisma } from "@prisma/client";

type ActionResponse = {
  success: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
  data?: any;
};

// Fungsi untuk membuat supplier baru
export async function createSupplierAction(
  data: SupplierFormValues
): Promise<ActionResponse> {
  try {
    const validationResult = supplierSchema.safeParse(data);

    if (!validationResult.success) {
      return {
        success: false,
        fieldErrors: validationResult.error.flatten().fieldErrors,
      };
    }

    const validData = validationResult.data;

    const supplier = await prisma.supplier.create({
      data: {
        nama: validData.nama,
        alamat: validData.alamat,
        noTelp: validData.noTelp,
        email: validData.email,
        namaKontak: validData.namaKontak,
        kota: validData.kota,
        kodePos: validData.kodePos,
        npwp: validData.npwp,
        noRekening: validData.noRekening,
        namaBank: validData.namaBank,
        catatan: validData.catatan,
      },
    });

    revalidatePath("/purchases/suppliers");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: "Supplier berhasil ditambahkan",
      data: supplier,
    };
  } catch (error) {
    console.error("Error creating supplier:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return {
          success: false,
          message: "Email sudah digunakan oleh supplier lain.",
        };
      }
    }
    return {
      success: false,
      message: "Terjadi kesalahan saat menambahkan supplier",
    };
  }
}

// Fungsi untuk mengupdate supplier
export async function updateSupplierAction(
  supplierId: number,
  data: SupplierFormValues
): Promise<ActionResponse> {
  try {
    const validationResult = supplierSchema.safeParse(data);

    if (!validationResult.success) {
      return {
        success: false,
        fieldErrors: validationResult.error.flatten().fieldErrors,
      };
    }

    const validData = validationResult.data;

    await prisma.supplier.update({
      where: { id: supplierId },
      data: {
        nama: validData.nama,
        alamat: validData.alamat,
        noTelp: validData.noTelp,
        email: validData.email,
        namaKontak: validData.namaKontak,
        kota: validData.kota,
        kodePos: validData.kodePos,
        npwp: validData.npwp,
        noRekening: validData.noRekening,
        namaBank: validData.namaBank,
        catatan: validData.catatan,
      },
    });

    revalidatePath("/purchases/suppliers");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: "Supplier berhasil diperbarui",
    };
  } catch (error) {
    console.error("Error updating supplier:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return {
          success: false,
          message: "Email sudah digunakan oleh supplier lain.",
        };
      }
    }
    return {
      success: false,
      message: "Terjadi kesalahan saat memperbarui supplier",
    };
  }
}

// Fungsi untuk menghapus supplier
export async function deleteSupplierAction(
  supplierId: number
): Promise<ActionResponse> {
  try {
    // Periksa apakah supplier digunakan oleh item atau pembelian
    const itemCount = await prisma.item.count({
      where: { supplierId },
    });

    const pembelianCount = await prisma.pembelianKeSupplier.count({
      where: { supplierId },
    });

    if (itemCount > 0 || pembelianCount > 0) {
      return {
        success: false,
        message:
          "Supplier tidak dapat dihapus karena masih digunakan oleh item atau pembelian",
      };
    }

    await prisma.supplier.delete({
      where: { id: supplierId },
    });

    revalidatePath("/purchases/suppliers");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: "Supplier berhasil dihapus",
    };
  } catch (error) {
    console.error("Error deleting supplier:", error);
    return {
      success: false,
      message: "Terjadi kesalahan saat menghapus supplier",
    };
  }
}

// Fungsi untuk mengambil daftar supplier dengan paginasi dan pencarian
export async function getSuppliers({
  page = 1,
  limit = 10,
  search = "",
}: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  try {
    const skip = (page - 1) * limit;

    // Buat kondisi where untuk pencarian
    let where = {};
    if (search) {
      where = {
        OR: [
          { nama: { contains: search, mode: "insensitive" } },
          { alamat: { contains: search, mode: "insensitive" } },
          { noTelp: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { namaKontak: { contains: search, mode: "insensitive" } },
          { kota: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    // Ambil data supplier dengan paginasi
    const suppliers = await prisma.supplier.findMany({
      where,
      skip,
      take: limit,
      orderBy: { nama: "asc" },
    });

    // Hitung total data untuk paginasi
    const totalSuppliers = await prisma.supplier.count({ where });

    return {
      data: suppliers,
      meta: {
        total: totalSuppliers,
        page,
        limit,
        totalPages: Math.ceil(totalSuppliers / limit),
      },
    };
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    throw new Error("Gagal mengambil data supplier");
  }
}

// Fungsi untuk mengambil detail supplier berdasarkan ID
export async function getSupplierById(supplierId: number) {
  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
    });

    if (!supplier) {
      throw new Error("Supplier tidak ditemukan");
    }

    return { data: supplier };
  } catch (error) {
    console.error("Error fetching supplier:", error);
    throw new Error("Gagal mengambil data supplier");
  }
}
