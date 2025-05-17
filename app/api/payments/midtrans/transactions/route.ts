// app/api/payments/midtrans/transactions/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");

    console.log("Fetching Midtrans transactions with params:", {
      fromDate,
      toDate,
    });

    // Mengambil data transaksi dari database lokal yang sudah diupdate oleh webhook
    const transactions = await prisma.transaksiPenjualan.findMany({
      where: {
        tanggalWaktuTransaksi: {
          // Jika tanggal tidak disediakan, ambil semua transaksi
          gte: fromDate ? new Date(fromDate) : undefined,
          lte: toDate ? new Date(toDate) : undefined,
        },
        // Hanya ambil transaksi yang menggunakan Midtrans
        // Gunakan OR untuk mengambil semua transaksi yang mungkin menggunakan Midtrans
        OR: [
          { paymentGatewayName: "Midtrans" },
          {
            pembayaranTransaksi: {
              some: { metodePembayaran: { contains: "MIDTRANS" } },
            },
          },
        ],
      },
      include: {
        pelanggan: true,
        pembayaranTransaksi: {
          orderBy: {
            waktuPembayaran: "desc",
          },
          take: 1,
        },
      },
      orderBy: {
        tanggalWaktuTransaksi: "desc",
      },
    });

    // Transformasi data ke format yang dibutuhkan aplikasi
    const formattedTransactions = transactions.map((transaction) => {
      // Ambil metode pembayaran dari pembayaran terakhir
      const lastPayment = transaction.pembayaranTransaksi[0];
      const metodePembayaran =
        lastPayment?.metodePembayaran.replace("_MIDTRANS", "") || "unknown";

      return {
        id: transaction.id,
        nomorStruk: transaction.nomorStruk,
        tanggalWaktuTransaksi: transaction.tanggalWaktuTransaksi.toISOString(),
        namaPelanggan: transaction.pelanggan?.nama || "Pelanggan Umum",
        pendapatan: Number(transaction.grandTotal),
        statusPembayaran: transaction.statusPembayaran.replace("_MIDTRANS", ""),
        statusTransaksi: transaction.statusTransaksi,
        metodePembayaran: metodePembayaran,
      };
    });

    console.log(
      `Returning ${formattedTransactions.length} Midtrans transactions`
    );

    return NextResponse.json({
      success: true,
      data: formattedTransactions,
    });
  } catch (error: any) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: error.message || "Gagal mengambil data transaksi" },
      { status: 500 }
    );
  }
}
