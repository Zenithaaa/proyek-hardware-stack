import { NextResponse } from "next/server";
import { prisma } from "@/lib/db"; // Pastikan path ke prisma client Anda benar
import type { ItemData } from "@/components/data-table"; // Impor tipe ItemData

export async function GET() {
  try {
    const items = await prisma.item.findMany({
      include: {
        kategori: true,
        supplier: true,
        detailTransaksi: {
          select: {
            jumlah: true,
          },
        },
      },
      orderBy: {
        id: "asc", // Contoh pengurutan, sesuaikan jika perlu
      },
    });

    const formattedItems: ItemData[] = items.map((item) => {
      const totalTerjual = item.detailTransaksi.reduce(
        (sum, detail) => sum + detail.jumlah,
        0
      );
      return {
        id: item.id,
        namaProduk: item.nama,
        category: item.kategori?.nama || "N/A",
        manufacture: item.manufacture || "N/A",
        terjual: totalTerjual,
        stok: item.stok,
        supplier: item.supplier?.nama || "N/A",
      };
    });

    return NextResponse.json(formattedItems, { status: 200 });
  } catch (error) {
    console.error("Error fetching items:", error);
    let errorMessage = "Failed to fetch items";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { message: errorMessage, error: String(error) },
      { status: 500 }
    );
  }
}
