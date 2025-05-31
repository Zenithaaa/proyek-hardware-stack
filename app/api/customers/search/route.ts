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

    const customers = await prisma.pelanggan.findMany({
      where: {
        OR: [
          { nama: { contains: query, mode: "insensitive" } },
          { noTelp: { contains: query } },
        ],
      },
      select: {
        id: true,
        nama: true,
        noTelp: true,
        poinLoyalitas: true,
        alamat: true,
        kota: true,
        kodePos: true,
      },
      take: 10,
    });

    return NextResponse.json(customers);
  } catch (error) {
    console.error("Error searching customers:", error);
    return NextResponse.json(
      { error: "Gagal mencari pelanggan" },
      { status: 500 }
    );
  }
}
