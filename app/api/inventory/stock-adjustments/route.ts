import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const searchQuery = searchParams.get("searchQuery") || "";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const jenisPenyesuaian = searchParams.get("jenisPenyesuaian");

    // Build where clause
    const where: any = {};

    if (startDate || endDate) {
      where.tanggal = {};
      if (startDate) {
        where.tanggal.gte = new Date(startDate);
      }
      if (endDate) {
        const nextDay = new Date(endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        where.tanggal.lt = nextDay;
      }
    }

    if (jenisPenyesuaian) {
      where.jenisPenyesuaian = jenisPenyesuaian;
    }

    if (searchQuery) {
      where.OR = [
        {
          item: {
            nama: {
              contains: searchQuery,
              mode: "insensitive",
            },
          },
        },
        {
          nomorReferensi: {
            contains: searchQuery,
            mode: "insensitive",
          },
        },
      ];
    }

    const totalCount = await prisma.penyesuaianStok.count({ where });
    const adjustments = await prisma.penyesuaianStok.findMany({
      where,
      include: {
        item: {
          select: {
            nama: true,
            kodeBarcode: true,
            stok: true,
          },
        },
      },
      orderBy: {
        tanggal: "desc",
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: adjustments,
      meta: {
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching stock adjustments:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Get current item stock
    const item = await prisma.item.findUnique({
      where: { id: data.itemId },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const stokSebelum = item.stok;
    let stokSesudah = stokSebelum;
    let tipeOperasi = data.tipeOperasi;
    let jumlah = data.jumlah;

    // Handle stock opname case
    if (
      data.jenisPenyesuaian === "Stok Opname" &&
      data.stokFisikBaru !== undefined
    ) {
      stokSesudah = data.stokFisikBaru;
      const perubahan = stokSesudah - stokSebelum;
      tipeOperasi =
        perubahan > 0 ? "Tambah" : perubahan < 0 ? "Kurang" : "Tambah";
      jumlah = Math.abs(perubahan);
    } else if (tipeOperasi === "Tambah") {
      stokSesudah = stokSebelum + jumlah;
    } else if (tipeOperasi === "Kurang") {
      stokSesudah = Math.max(0, stokSebelum - jumlah);
    }

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      const penyesuaian = await tx.penyesuaianStok.create({
        data: {
          itemId: data.itemId,
          tanggal: new Date(data.tanggal),
          jenisPenyesuaian: data.jenisPenyesuaian,
          tipeOperasi,
          jumlah,
          stokSebelum,
          stokSesudah,
          keterangan: data.keterangan,
          nomorReferensi: data.nomorReferensi,
        },
      });

      const updatedItem = await tx.item.update({
        where: { id: data.itemId },
        data: { stok: stokSesudah },
      });

      return { penyesuaian, updatedItem };
    });

    return NextResponse.json({
      success: true,
      message: "Penyesuaian stok berhasil disimpan.",
      data: result.penyesuaian,
    });
  } catch (error) {
    console.error("Error creating stock adjustment:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
