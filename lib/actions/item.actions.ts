"use server";

import { prisma } from "@/lib/db"; // Make sure this path to your Prisma client is correct
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
// Import schema from the new location
import { createItemSchema, CreateItemPayload } from "@/lib/schemas/item.schema";

// Existing deleteItemAction - NO CHANGES HERE
export async function deleteItemAction(itemId: number) {
  try {
    await prisma.item.delete({
      where: { id: itemId },
    });
    revalidatePath("/dashboard");
    revalidatePath("/inventory/items"); // Good to revalidate items list too
    return { success: true, message: "Item berhasil dihapus." };
  } catch (error) {
    console.error("Error deleting item:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2003") {
        return {
          success: false,
          message:
            "Gagal menghapus item. Item ini direferensikan dalam catatan lain (misalnya, transaksi, pembelian). Hapus catatan terkait terlebih dahulu.",
        };
      }
      if (error.code === "P2025") {
        return {
          success: false,
          message: "Gagal menghapus item. Item tidak ditemukan.",
        };
      }
    }
    return {
      success: false,
      message: "Terjadi kesalahan tak terduga saat menghapus item.",
    };
  }
}

export interface GetItemsParams {
  search?: string;
  kategoriId?: number;
  supplierId?: number;
  statusStok?: "all" | "low" | "out" | "normal";
}

// Fungsi untuk mengambil daftar item dengan filter
export async function getItems(params: GetItemsParams = {}) {
  try {
    const { search, kategoriId, supplierId, statusStok } = params;

    const where: Prisma.ItemWhereInput = {};

    if (search) {
      where.OR = [
        { nama: { contains: search, mode: "insensitive" } },
        { kodeBarcode: { contains: search, mode: "insensitive" } },
      ];
    }

    if (kategoriId) {
      where.kategoriId = kategoriId;
    }

    if (supplierId) {
      where.supplierId = supplierId;
    }

    if (statusStok) {
      switch (statusStok) {
        case "low":
          where.stok = { lte: 10, gt: 0 };
          break;
        case "out":
          where.stok = { equals: 0 };
          break;
        case "normal":
          where.stok = { gt: 10 };
          break;
      }
    }

    const items = await prisma.item.findMany({
      where,
      include: {
        kategori: {
          select: {
            id: true,
            nama: true,
          },
        },
        supplier: {
          select: {
            id: true,
            nama: true,
          },
        },
      },
    });

    // Konversi nilai Decimal menjadi number sebelum mengirim ke client
    const formattedItems = items.map((item) => ({
      ...item,
      hargaJual: item.hargaJual ? Number(item.hargaJual) : 0,
      hargaBeli: item.hargaBeli ? Number(item.hargaBeli) : null,
    }));

    return { data: formattedItems };
  } catch (error) {
    console.error("Error getting items:", error);
    throw new Error("Failed to get items");
  }
}

// Fungsi untuk mengambil daftar kategori
export async function getKategori() {
  try {
    const kategori = await prisma.kategori.findMany({
      select: {
        id: true,
        nama: true,
      },
    });

    return { data: kategori };
  } catch (error) {
    console.error("Error getting kategori:", error);
    throw new Error("Failed to get kategori");
  }
}

// Fungsi untuk mengambil daftar supplier
export async function getSupplier() {
  try {
    const supplier = await prisma.supplier.findMany({
      select: {
        id: true,
        nama: true,
      },
    });

    return { data: supplier };
  } catch (error) {
    console.error("Error getting supplier:", error);
    throw new Error("Failed to get supplier");
  }
}

// --- createItemAction (Uses imported schema) ---

export async function createItemAction(payload: CreateItemPayload): Promise<{
  success: boolean;
  message: string;
  item?: { id: number; nama: string };
  error?: string;
  fieldErrors?: Record<string, string[]>;
}> {
  // Validation is now done using the imported schema
  const validationResult = createItemSchema.safeParse(payload);
  if (!validationResult.success) {
    return {
      success: false,
      message: "Data input tidak valid.",
      fieldErrors: validationResult.error.flatten().fieldErrors,
    };
  }

  const {
    nama,
    kategoriId,
    hargaJual,
    hargaBeli,
    stok,
    stokMinimum,
    manufacture,
    kodeBarcode,
    supplierId,
    satuan,
  } = validationResult.data;

  try {
    if (kodeBarcode) {
      const existingItemByBarcode = await prisma.item.findUnique({
        where: { kodeBarcode },
      });
      if (existingItemByBarcode) {
        return {
          success: false,
          message: `Kode barcode "${kodeBarcode}" sudah digunakan.`,
          fieldErrors: {
            kodeBarcode: [`Kode barcode "${kodeBarcode}" sudah digunakan.`],
          },
        };
      }
    }

    const newItem = await prisma.item.create({
      data: {
        nama,
        kategoriId: kategoriId,
        hargaJual: new Prisma.Decimal(hargaJual),
        hargaBeli: hargaBeli ? new Prisma.Decimal(hargaBeli) : null,
        stok,
        stokMinimum: stokMinimum === null ? 0 : stokMinimum,
        manufacture: manufacture,
        kodeBarcode: kodeBarcode,
        supplierId: supplierId,
        satuan: satuan || "Pcs",
      },
      select: {
        id: true,
        nama: true,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/inventory/items");
    revalidatePath("/inventory/items/new");

    return {
      success: true,
      message: `Item "${newItem.nama}" berhasil ditambahkan.`,
      item: newItem,
    };
  } catch (error) {
    console.error("Error creating item:", error);
    let errorMessage = "Gagal menambahkan item ke database.";
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        const target = error.meta?.target as string[] | undefined;
        if (
          target &&
          (target.includes("KodeBarcode") ||
            target.includes("tbl_item_KodeBarcode_key"))
        ) {
          errorMessage = `Kode barcode "${kodeBarcode}" sudah digunakan.`;
          return {
            success: false,
            message: errorMessage,
            fieldErrors: { kodeBarcode: [errorMessage] },
          };
        } else {
          errorMessage = "Terjadi pelanggaran unik pada data item.";
        }
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    return { success: false, message: errorMessage, error: String(error) };
  }
}

// --- Selection Functions (No changes needed here, they are already async) ---

export async function getCategoriesForSelection() {
  try {
    const categories = await prisma.kategori.findMany({
      select: {
        id: true,
        nama: true,
      },
      orderBy: {
        nama: "asc",
      },
    });
    return categories;
  } catch (error) {
    console.error("Error fetching categories for selection:", error);
    return [];
  }
}

export async function getSuppliersForSelection() {
  try {
    const suppliers = await prisma.supplier.findMany({
      select: {
        id: true,
        nama: true,
      },
      orderBy: {
        nama: "asc",
      },
    });
    return suppliers;
  } catch (error) {
    console.error("Error fetching suppliers for selection:", error);
    return [];
  }
}
