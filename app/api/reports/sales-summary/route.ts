import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const customerId = searchParams.get("customerId");
    const categoryId = searchParams.get("categoryId");
    const itemId = searchParams.get("itemId");
    const skip = (page - 1) * limit;

    // Basic query to fetch transactions with related data
    const transactions = await prisma.transaksiPenjualan.findMany({
      skip: skip,
      take: limit,
      include: {
        pelanggan: true, // Join with Pelanggan
        detailTransaksiPenjualan: {
          include: {
            item: {
              include: {
                kategori: true,
              },
            },
          },
        },
        pembayaranTransaksi: true, // Join with PembayaranTransaksi
        //user: true, // Join with User - uncomment if you have a User model and relation
      },
      orderBy: {
        tanggalWaktuTransaksi: "desc",
      },
      where: {
        tanggalWaktuTransaksi: {
          gte: fromDate ? new Date(fromDate) : undefined,
          lte: toDate ? new Date(toDate) : undefined,
        },
        pelangganId:
          customerId !== "all" && customerId
            ? parseInt(customerId, 10)
            : undefined,
        detailTransaksiPenjualan: {
          some: {
            item: {
              kategoriId:
                categoryId !== "all" && categoryId
                  ? parseInt(categoryId, 10)
                  : undefined,
              id: itemId !== "all" && itemId ? parseInt(itemId, 10) : undefined,
            },
          },
        },
      },
    });

    const totalTransactions = await prisma.transaksiPenjualan.count({
      where: {
        tanggalWaktuTransaksi: {
          gte: fromDate ? new Date(fromDate) : undefined,
          lte: toDate ? new Date(toDate) : undefined,
        },
        pelangganId:
          customerId !== "all" && customerId
            ? parseInt(customerId, 10)
            : undefined,
        detailTransaksiPenjualan: {
          some: {
            item: {
              kategoriId:
                categoryId !== "all" && categoryId
                  ? parseInt(categoryId, 10)
                  : undefined,
              id: itemId !== "all" && itemId ? parseInt(itemId, 10) : undefined,
            },
          },
        },
      },
    });

    const customers = await prisma.pelanggan.findMany({
      select: { id: true, nama: true },
      orderBy: { nama: "asc" },
    });

    const categories = await prisma.kategori.findMany({
      select: { id: true, nama: true },
      orderBy: { nama: "asc" },
    });

    const items = await prisma.item.findMany({
      select: { id: true, nama: true },
      orderBy: { nama: "asc" },
    });

    return NextResponse.json({
      data: transactions,
      total: totalTransactions,
      page: page,
      limit: limit,
      filters: {
        customers,
        categories,
        items,
      },
    });
  } catch (error) {
    console.error("Error fetching sales report:", error);
    return NextResponse.json(
      { error: "Failed to fetch sales report" },
      { status: 500 }
    );
  }
}

export async function GET_CUSTOMERS(request: Request) {
  try {
    const customers = await prisma.pelanggan.findMany({
      select: { id: true, nama: true },
      orderBy: { nama: "asc" },
    });
    return NextResponse.json(customers);
  } catch (error) {
    console.error("Error fetching customers:", error);
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}

export async function GET_CATEGORIES(request: Request) {
  try {
    const categories = await prisma.kategori.findMany({
      select: { id: true, nama: true },
      orderBy: { nama: "asc" },
    });
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

export async function GET_ITEMS(request: Request) {
  try {
    const items = await prisma.item.findMany({
      select: { id: true, nama: true },
      orderBy: { nama: "asc" },
    });
    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching items:", error);
    return NextResponse.json(
      { error: "Failed to fetch items" },
      { status: 500 }
    );
  }
}
