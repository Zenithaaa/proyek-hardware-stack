import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");
    const searchQuery = searchParams.get("searchQuery");
    const paymentStatus = searchParams.get("paymentStatus");
    const transactionStatus = searchParams.get("transactionStatus");
    const paymentMethod = searchParams.get("paymentMethod");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const userId = searchParams.get("userId"); // Filter berdasarkan kasir

    let where: Prisma.TransaksiPenjualanWhereInput = {};

    // Filter berdasarkan rentang tanggal
    if (fromDate || toDate) {
      where.tanggalWaktuTransaksi = {};
      if (fromDate) {
        where.tanggalWaktuTransaksi.gte = new Date(fromDate);
      }
      if (toDate) {
        // Tambahkan 1 hari ke tanggal 'to' untuk mencakup seluruh hari tersebut
        const endDate = new Date(toDate);
        endDate.setDate(endDate.getDate() + 1);
        where.tanggalWaktuTransaksi.lt = endDate;
      }
    }

    // Filter berdasarkan pencarian (nomorStruk atau namaPelanggan)
    if (searchQuery) {
      where.OR = [
        { nomorStruk: { contains: searchQuery, mode: "insensitive" } },
        { pelanggan: { nama: { contains: searchQuery, mode: "insensitive" } } },
        {
          paymentGatewayOrderId: { contains: searchQuery, mode: "insensitive" },
        },
      ];
    }

    // Filter berdasarkan status pembayaran
    if (paymentStatus && paymentStatus !== "all") {
      // Sesuaikan nilai status pembayaran dengan yang ada di database
      let dbPaymentStatus;
      if (paymentStatus === "paid") dbPaymentStatus = "PAID_VIA_MIDTRANS";
      // Atau status 'Lunas' jika tidak pakai Midtrans
      else if (paymentStatus === "pending")
        dbPaymentStatus = "PENDING_PAYMENT_GATEWAY";
      // Atau status 'Tidak Lunas'
      else if (paymentStatus === "failed") dbPaymentStatus = "DIBATALKAN"; // Atau status 'Gagal'
      // Tambahkan status lain jika ada

      if (dbPaymentStatus) {
        where.statusPembayaran = dbPaymentStatus;
      }
    }

    // Filter berdasarkan status transaksi
    if (transactionStatus && transactionStatus !== "all") {
      // Sesuaikan nilai status transaksi dengan yang ada di database
      let dbTransactionStatus;
      if (transactionStatus === "completed")
        dbTransactionStatus = "SELESAI"; // Atau status 'Lunas'
      else if (transactionStatus === "pending")
        dbTransactionStatus = "TERTAHAN"; // Atau status 'Ditahan'
      else if (transactionStatus === "cancelled")
        dbTransactionStatus = "DIBATALKAN"; // Atau status 'Gagal/Cancel'
      // Tambahkan status lain jika ada

      if (dbTransactionStatus) {
        where.statusTransaksi = dbTransactionStatus;
      }
    }

    // Filter berdasarkan metode pembayaran
    if (paymentMethod && paymentMethod !== "all") {
      // Metode pembayaran disimpan di tabel PembayaranTransaksi
      where.pembayaranTransaksi = {
        some: {
          metodePembayaran: {
            contains: paymentMethod.toUpperCase(),
            mode: "insensitive",
          },
          statusDetailPembayaran: "SUCCESS", // Hanya cari pembayaran yang sukses
        },
      };
    }

    // Filter berdasarkan kasir (userId)
    if (userId) {
      where.userId = userId;
    }

    // Hitung total data untuk paginasi
    const totalCount = await prisma.transaksiPenjualan.count({ where });

    // Ambil data transaksi dengan paginasi
    const transactions = await prisma.transaksiPenjualan.findMany({
      where,
      include: {
        pelanggan: { select: { nama: true } }, // Ambil nama pelanggan
        pembayaranTransaksi: {
          // Ambil detail pembayaran untuk menentukan metode bayar
          where: { statusDetailPembayaran: "SUCCESS" }, // Hanya pembayaran yang sukses
          orderBy: { waktuPembayaran: "desc" }, // Ambil pembayaran terbaru jika ada beberapa
          take: 1, // Ambil hanya satu pembayaran sukses
        },
      },
      orderBy: {
        tanggalWaktuTransaksi: "desc",
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // Format data untuk respons
    const formattedTransactions = transactions.map((tx) => ({
      id: tx.id,
      nomorStruk: tx.nomorStruk,
      tanggalWaktuTransaksi: tx.tanggalWaktuTransaksi.toISOString(),
      namaPelanggan: tx.pelanggan?.nama || "-", // Handle kasus tanpa pelanggan
      pendapatan: tx.grandTotal.toNumber(), // Konversi Decimal ke Number
      statusPembayaran:
        tx.statusPembayaran === "PAID_VIA_MIDTRANS" ? "Lunas" : "Tidak Lunas", // Sesuaikan mapping status
      statusTransaksi:
        tx.statusTransaksi === "SELESAI"
          ? "Selesai"
          : tx.statusTransaksi === "TERTAHAN"
          ? "Tertahan"
          : "Dibatalkan", // Sesuaikan mapping status
      metodePembayaran:
        tx.pembayaranTransaksi[0]?.metodePembayaran.replace("_MIDTRANS", "") ||
        "-", // Ambil metode dari pembayaran sukses pertama
    }));

    // Hitung total pendapatan berdasarkan filter yang diterapkan
    const totalRevenue = await prisma.transaksiPenjualan.aggregate({
      where: {
        ...where,
        statusPembayaran: "PAID_VIA_MIDTRANS", // Hanya hitung transaksi yang sudah lunas
      },
      _sum: {
        grandTotal: true,
      },
    });

    // Hitung jumlah transaksi berdasarkan filter yang diterapkan
    const transactionCount = await prisma.transaksiPenjualan.count({
      where: {
        ...where,
        statusPembayaran: "PAID_VIA_MIDTRANS", // Hanya hitung transaksi yang sudah lunas
      },
    });

    // Hitung rata-rata per transaksi
    const averagePerTransaction =
      transactionCount > 0
        ? (totalRevenue._sum.grandTotal?.toNumber() || 0) / transactionCount
        : 0;

    return NextResponse.json({
      success: true,
      data: formattedTransactions,
      meta: {
        totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
        totalRevenue: totalRevenue._sum.grandTotal?.toNumber() || 0,
        transactionCount,
        averagePerTransaction,
      },
    });
  } catch (error: any) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Gagal mengambil data transaksi",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, statusTransaksi } = body;

    if (!id || !statusTransaksi) {
      return NextResponse.json(
        {
          success: false,
          error: "ID transaksi dan status transaksi diperlukan",
        },
        { status: 400 }
      );
    }

    const updatedTransaction = await prisma.transaksiPenjualan.update({
      where: { id: id },
      data: {
        statusTransaksi: statusTransaksi,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Status transaksi berhasil diperbarui",
      data: updatedTransaction,
    });
  } catch (error: any) {
    console.error("Error updating transaction status:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Gagal memperbarui status transaksi",
      },
      { status: 500 }
    );
  }
}
