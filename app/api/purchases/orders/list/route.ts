import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const searchQuery = searchParams.get("search") || "";
    const statusFilter = searchParams.get("status") || "Semua";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10); // Assuming a default limit
    const skip = (page - 1) * limit;

    // Date range filtering (assuming date format is YYYY-MM-DD)
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    let dateFilter = {};
    if (startDateParam && endDateParam) {
      const startDate = new Date(startDateParam);
      const endDate = new Date(endDateParam);
      // Set end date to the end of the day
      endDate.setHours(23, 59, 59, 999);
      dateFilter = {
        tanggalPesan: {
          gte: startDate,
          lte: endDate,
        },
      };
    } else if (startDateParam) {
      const startDate = new Date(startDateParam);
      dateFilter = {
        tanggalPesan: {
          gte: startDate,
        },
      };
    } else if (endDateParam) {
      const endDate = new Date(endDateParam);
      endDate.setHours(23, 59, 59, 999);
      dateFilter = {
        tanggalPesan: {
          lte: endDate,
        },
      };
    }

    const whereClause: any = {
      ...dateFilter,
    };

    if (statusFilter !== "Semua") {
      whereClause.status = statusFilter;
    }

    if (searchQuery) {
      whereClause.OR = [
        { nomorPO: { contains: searchQuery, mode: "insensitive" as const } },
        {
          supplier: {
            nama: { contains: searchQuery, mode: "insensitive" as const },
          },
        },
      ];
    }

    const [totalCount, purchaseOrders] = await prisma.$transaction([
      prisma.pembelianKeSupplier.count({ where: whereClause }),
      prisma.pembelianKeSupplier.findMany({
        where: whereClause,
        include: {
          supplier: { select: { nama: true } }, // Include supplier name
        },
        orderBy: { tanggalPesan: "desc" }, // Order by date, latest first
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    // Map the result to match the structure expected by the frontend
    const formattedPurchaseOrders = purchaseOrders.map((po) => ({
      id: po.id,
      nomorPO: po.nomorPO,
      tanggalPesan: po.tanggalPesan,
      namaSupplier: po.supplier.nama,
      total: po.total.toNumber(), // Convert Decimal to Number
      status: po.status,
      tanggalJatuhTempo: po.tanggalJatuhTempo,
    }));

    return NextResponse.json({
      data: formattedPurchaseOrders,
      meta: {
        totalPages,
        totalCount,
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching purchase orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch purchase orders" },
      { status: 500 }
    );
  }
}
