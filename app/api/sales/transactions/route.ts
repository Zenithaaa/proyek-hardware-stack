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

    // Hitung total pendapatan berdasarkan filter yang diterapkan (semua transaksi)
    const totalRevenue = await prisma.transaksiPenjualan.aggregate({
      where: where, // Gunakan filter yang sama tanpa batasan status pembayaran
      _sum: {
        grandTotal: true,
      },
    });

    // Hitung jumlah transaksi berdasarkan filter yang diterapkan (semua transaksi)
    const transactionCount = await prisma.transaksiPenjualan.count({
      where: where, // Gunakan filter yang sama tanpa batasan status pembayaran
    });

    // Hitung rata-rata per transaksi
    const averagePerTransaction =
      transactionCount > 0
        ? (totalRevenue._sum.grandTotal?.toNumber() || 0) / transactionCount
        : 0;

    // Hitung persentase perubahan untuk KPI
    // Buat filter untuk periode sebelumnya (dengan rentang waktu yang sama)
    let previousWhere: Prisma.TransaksiPenjualanWhereInput = {};

    if (fromDate && toDate) {
      // Jika ada rentang tanggal, hitung periode sebelumnya dengan durasi yang sama
      const currentFrom = new Date(fromDate);
      const currentTo = new Date(toDate);
      const durationMs = currentTo.getTime() - currentFrom.getTime();

      const previousFrom = new Date(currentFrom.getTime() - durationMs);
      const previousTo = new Date(currentFrom.getTime() - 1); // 1ms sebelum periode saat ini

      previousWhere.tanggalWaktuTransaksi = {
        gte: previousFrom,
        lte: previousTo,
      };
    } else {
      // Jika tidak ada rentang tanggal, bandingkan dengan bulan sebelumnya
      const currentDate = new Date();
      const firstDayCurrentMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1
      );
      const lastDayPreviousMonth = new Date(firstDayCurrentMonth.getTime() - 1);
      const firstDayPreviousMonth = new Date(
        lastDayPreviousMonth.getFullYear(),
        lastDayPreviousMonth.getMonth(),
        1
      );

      previousWhere.tanggalWaktuTransaksi = {
        gte: firstDayPreviousMonth,
        lte: lastDayPreviousMonth,
      };
    }

    // Tambahkan filter lain yang sama dengan filter saat ini (kecuali tanggal)
    if (paymentStatus && paymentStatus !== "all") {
      let dbPaymentStatus;
      if (paymentStatus === "paid") dbPaymentStatus = "PAID_VIA_MIDTRANS";
      else if (paymentStatus === "pending")
        dbPaymentStatus = "PENDING_PAYMENT_GATEWAY";
      else if (paymentStatus === "failed") dbPaymentStatus = "DIBATALKAN";

      if (dbPaymentStatus) {
        previousWhere.statusPembayaran = dbPaymentStatus;
      }
    }

    if (transactionStatus && transactionStatus !== "all") {
      let dbTransactionStatus;
      if (transactionStatus === "completed") dbTransactionStatus = "SELESAI";
      else if (transactionStatus === "pending")
        dbTransactionStatus = "TERTAHAN";
      else if (transactionStatus === "cancelled")
        dbTransactionStatus = "DIBATALKAN";

      if (dbTransactionStatus) {
        previousWhere.statusTransaksi = dbTransactionStatus;
      }
    }

    if (paymentMethod && paymentMethod !== "all") {
      previousWhere.pembayaranTransaksi = {
        some: {
          metodePembayaran: {
            contains: paymentMethod.toUpperCase(),
            mode: "insensitive",
          },
          statusDetailPembayaran: "SUCCESS",
        },
      };
    }

    if (userId) {
      previousWhere.userId = userId;
    }

    // Ambil data periode sebelumnya
    const previousTotalRevenue = await prisma.transaksiPenjualan.aggregate({
      where: previousWhere,
      _sum: {
        grandTotal: true,
      },
    });

    const previousTransactionCount = await prisma.transaksiPenjualan.count({
      where: previousWhere,
    });

    const previousAveragePerTransaction =
      previousTransactionCount > 0
        ? (previousTotalRevenue._sum.grandTotal?.toNumber() || 0) /
          previousTransactionCount
        : 0;

    // Hitung persentase perubahan
    const calculatePercentageChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const revenueChangePercent = calculatePercentageChange(
      totalRevenue._sum.grandTotal?.toNumber() || 0,
      previousTotalRevenue._sum.grandTotal?.toNumber() || 0
    );

    const transactionCountChangePercent = calculatePercentageChange(
      transactionCount,
      previousTransactionCount
    );

    const averagePerTransactionChangePercent = calculatePercentageChange(
      averagePerTransaction,
      previousAveragePerTransaction
    );

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
        revenueChangePercent: parseFloat(revenueChangePercent.toFixed(1)),
        transactionCountChangePercent: parseFloat(
          transactionCountChangePercent.toFixed(1)
        ),
        averagePerTransactionChangePercent: parseFloat(
          averagePerTransactionChangePercent.toFixed(1)
        ),
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
