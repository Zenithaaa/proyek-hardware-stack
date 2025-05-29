import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
    const searchQuery = searchParams.get("searchQuery") || "";
    const filterCity = searchParams.get("filterCity") || "";

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const where: any = {};

    if (searchQuery) {
      where.OR = [
        { nama: { contains: searchQuery, mode: "insensitive" } },
        { noTelp: { contains: searchQuery, mode: "insensitive" } },
        { email: { contains: searchQuery, mode: "insensitive" } },
      ];
    }

    if (filterCity) {
      where.kota = { contains: filterCity, mode: "insensitive" };
    }

    const customers = await prisma.pelanggan.findMany({
      where,
      skip,
      take,
      orderBy: {
        tanggalRegistrasi: "desc",
      },
    });

    const totalCount = await prisma.pelanggan.count({ where });

    return NextResponse.json({
      success: true,
      data: customers,
      meta: {
        totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    });
  } catch (error: any) {
    console.error("Error fetching customers:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch customers" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get("id") || "", 10);
    const body = await request.json();

    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid customer ID" },
        { status: 400 }
      );
    }

    const updatedCustomer = await prisma.pelanggan.update({
      where: { id: id },
      data: {
        nama: body.nama,
        jenisKelamin: body.jenisKelamin || null,
        noTelp: body.noTelp || null,
        alamat: body.alamat || null,
        email: body.email || null,
        // poinLoyalitas: body.poinLoyalitas, // Assuming loyalty points are updated separately or read-only via this form
        tanggalRegistrasi: body.tanggalRegistrasi
          ? new Date(body.tanggalRegistrasi)
          : null,
      },
    });

    return NextResponse.json({ success: true, data: updatedCustomer });
  } catch (error: any) {
    console.error("Error updating customer:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update customer" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get("id") || "", 10);

    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid customer ID" },
        { status: 400 }
      );
    }

    await prisma.pelanggan.delete({
      where: { id: id },
    });

    return NextResponse.json({ success: true, data: null });
  } catch (error: any) {
    console.error("Error deleting customer:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete customer" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  console.log("Received POST request to /api/customers");
  try {
    const body = await request.json();
    const newCustomer = await prisma.pelanggan.create({
      data: {
        nama: body.nama,
        jenisKelamin: body.jenisKelamin || null,
        noTelp: body.noTelp || null,
        alamat: body.alamat || null,
        email: body.email || null,
        poinLoyalitas: body.poinLoyalitas || 0,
        tanggalRegistrasi: body.tanggalRegistrasi
          ? new Date(body.tanggalRegistrasi)
          : new Date(),
      },
    });

    return NextResponse.json(
      { success: true, data: newCustomer },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating customer:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create customer" },
      { status: 500 }
    );
  }
}
