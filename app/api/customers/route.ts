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
      select: {
        id: true,
        nama: true,
        jenisKelamin: true,
        noTelp: true,
        alamat: true,
        email: true,
        poinLoyalitas: true,
        tanggalRegistrasi: true,
        kota: true,
        kodePos: true,
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
        kota: body.kota || null,
        kodePos: body.kodePos || null,
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
