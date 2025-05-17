import { NextResponse } from "next/server";
import prisma from "@/src/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query) {
      return NextResponse.json(
        { error: "Query pencarian diperlukan" },
        { status: 400 }
      );
    }

    const items = await prisma.item.findMany({
      where: {
        OR: [
          { nama: { contains: query, mode: "insensitive" } },
          { kodeBarcode: { contains: query, mode: "insensitive" } },
        ],
        stok: { gt: 0 },
      },
      select: {
        id: true,
        nama: true,
        hargaJual: true,
        stok: true,
        kodeBarcode: true,
        satuan: true,
      },
      take: 10,
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("Error searching items:", error);
    return NextResponse.json(
      { error: "Gagal mencari barang" },
      { status: 500 }
    );
  }
}
