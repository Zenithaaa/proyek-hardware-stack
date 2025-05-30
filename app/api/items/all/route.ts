import { NextResponse } from "next/server";
import prisma from "@/src/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");
    const skip = (page - 1) * limit;

    // Ambil total jumlah barang untuk pagination
    const totalItems = await prisma.item.count({
      where: {
        stok: { gt: 0 }, // Hanya barang dengan stok > 0
      },
    });

    // Ambil barang dengan pagination
    const items = await prisma.item.findMany({
      where: {
        stok: { gt: 0 }, // Hanya barang dengan stok > 0
      },
      select: {
        id: true,
        nama: true,
        hargaJual: true,
        stok: true,
        kodeBarcode: true,
        satuan: true,
      },
      skip,
      take: limit,
      orderBy: {
        nama: "asc",
      },
    });

    return NextResponse.json({
      items,
      pagination: {
        total: totalItems,
        page,
        limit,
        totalPages: Math.ceil(totalItems / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching items:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data barang" },
      { status: 500 }
    );
  }
}
