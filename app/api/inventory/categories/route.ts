import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET semua kategori
export async function GET() {
  try {
    const categories = await prisma.kategori.findMany({
      include: {
        _count: {
          select: { items: true },
        },
      },
    });
    return NextResponse.json(categories, { status: 200 });
  } catch (error) {
    return NextResponse.json([], { status: 500 });
  }
}

// Membuat kategori baru
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const newCategory = await prisma.kategori.create({
      data: {
        nama: body.nama,
        description: body.description || null,
      },
    });

    return NextResponse.json(newCategory, { status: 201 });
  } catch (error) {
    console.error("Error creating category:", error);
    let errorMessage = "Gagal membuat kategori baru";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// Mengupdate kategori
export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { error: "ID kategori diperlukan" },
        { status: 400 }
      );
    }

    const body = await request.json();

    const updatedCategory = await prisma.kategori.update({
      where: { id: parseInt(id, 10) },
      data: {
        nama: body.nama,
        description: body.description || null,
      },
    });

    return NextResponse.json(updatedCategory, { status: 200 });
  } catch (error) {
    console.error("Error updating category:", error);
    let errorMessage = "Gagal mengupdate kategori";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
