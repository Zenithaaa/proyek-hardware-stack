import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET semua kategori
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);

    const skip = (page - 1) * pageSize;

    const categories = await prisma.kategori.findMany({
      skip: skip,
      take: pageSize,
      include: {
        _count: {
          select: { items: true },
        },
      },
      orderBy: {
        // Optional: Add default ordering
        nama: "asc",
      },
    });

    const totalCategories = await prisma.kategori.count();

    return NextResponse.json({ categories, totalCategories }, { status: 200 });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      {
        categories: [],
        totalCategories: 0,
        error: "Failed to fetch categories",
      },
      { status: 500 }
    );
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

// Menghapus kategori
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID kategori diperlukan" },
        { status: 400 }
      );
    }

    await prisma.kategori.delete({
      where: { id: parseInt(id, 10) },
    });

    return NextResponse.json(
      { message: "Kategori berhasil dihapus" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting category:", error);
    let errorMessage = "Gagal menghapus kategori";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
