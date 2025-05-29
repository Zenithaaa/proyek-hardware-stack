import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
    const searchQuery = searchParams.get("searchQuery") || "";
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    let dateFilter = {};
    if (fromDate && toDate) {
      dateFilter = {
        tanggalPenerimaan: {
          gte: new Date(fromDate),
          lte: new Date(`${toDate}T23:59:59.999Z`), // Include the whole end day
        },
      };
    } else if (fromDate) {
      dateFilter = {
        tanggalPenerimaan: {
          gte: new Date(fromDate),
        },
      };
    } else if (toDate) {
      dateFilter = {
        tanggalPenerimaan: {
          lte: new Date(`${toDate}T23:59:59.999Z`),
        },
      };
    }

    const where: Prisma.PenerimaanBarangHeaderWhereInput = {
      AND: [
        dateFilter,
        searchQuery
          ? {
              OR: [
                {
                  nomorDokumen: { contains: searchQuery, mode: "insensitive" },
                },
                {
                  nomorSuratJalanSupplier: {
                    contains: searchQuery,
                    mode: "insensitive",
                  },
                },
                {
                  pembelianKeSupplier: {
                    nomorPO: { contains: searchQuery, mode: "insensitive" },
                  },
                },
                {
                  supplier: {
                    nama: { contains: searchQuery, mode: "insensitive" },
                  },
                },
              ],
            }
          : {},
      ],
    };

    const [receipts, totalCount] = await prisma.$transaction([
      prisma.penerimaanBarangHeader.findMany({
        where,
        include: {
          supplier: { select: { nama: true } },
          pembelianKeSupplier: { select: { nomorPO: true, status: true } }, // Include PO status
        },
        skip,
        take,
        orderBy: {
          tanggalPenerimaan: "desc",
        },
      }),
      prisma.penerimaanBarangHeader.count({ where }),
    ]);

    const formattedReceipts = receipts.map((receipt) => ({
      id: receipt.id,
      nomorDokumenPenerimaan: receipt.nomorDokumen,
      tanggalPenerimaan: receipt.tanggalPenerimaan.toISOString(),
      nomorSuratJalanSupplier: receipt.nomorSuratJalanSupplier || "-",
      nomorPO: receipt.pembelianKeSupplier?.nomorPO || null,
      namaSupplier: receipt.supplier.nama,
      status: receipt.pembelianKeSupplier
        ? receipt.pembelianKeSupplier.status // Use PO status if PO exists
        : receipt.statusPenerimaan === "LENGKAP_SESUAI_PO"
        ? "Lengkap Sesuai PO"
        : receipt.statusPenerimaan === "SEBAGIAN_DITERIMA"
        ? "Sebagian Diterima"
        : "Tanpa PO", // Use receipt status if no PO, map enum to display text
    }));

    return NextResponse.json({
      success: true,
      data: formattedReceipts,
      meta: {
        totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    });
  } catch (error) {
    console.error("Error fetching receipts:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch receipts" },
      { status: 500 }
    );
  }
}
