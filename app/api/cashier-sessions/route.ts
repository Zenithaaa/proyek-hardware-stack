import { NextResponse } from "next/server";
import prisma from "@/src/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, modalAwal, catatanSesi } = body;

    // Validasi input
    if (!userId) {
      return NextResponse.json(
        { error: "User ID diperlukan" },
        { status: 400 }
      );
    }

    // Buat sesi kasir baru
    const sesiKasir = await prisma.sesiKasir.create({
      data: {
        userId,
        modalAwal: modalAwal || 0,
        catatanSesi,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Sesi kasir berhasil dibuat",
      data: sesiKasir,
    });
  } catch (error: any) {
    console.error("Error creating cashier session:", error);
    return NextResponse.json(
      { error: error.message || "Gagal membuat sesi kasir" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Ambil semua sesi kasir yang aktif (belum ditutup)
    const activeSessions = await prisma.sesiKasir.findMany({
      where: {
        waktuTutup: null,
      },
      orderBy: {
        waktuBuka: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: activeSessions,
    });
  } catch (error: any) {
    console.error("Error fetching cashier sessions:", error);
    return NextResponse.json(
      { error: error.message || "Gagal mengambil data sesi kasir" },
      { status: 500 }
    );
  }
}
