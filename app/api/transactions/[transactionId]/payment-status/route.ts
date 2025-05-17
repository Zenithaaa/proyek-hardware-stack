// app/api/transactions/[transactionId]/payment-status/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: { transactionId: string } }
) {
  try {
    const { transactionId } = params;
    const body = await request.json();
    const { payments, midtransTransactionId } = body;

    if (!transactionId) {
      return NextResponse.json(
        { error: "ID transaksi tidak ditemukan" },
        { status: 400 }
      );
    }

    // Cari transaksi berdasarkan ID
    const transaction = await prisma.transaksiPenjualan.findUnique({
      where: { nomorStruk: transactionId },
      include: { pembayaranTransaksi: true },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaksi tidak ditemukan" },
        { status: 404 }
      );
    }

    // Update status pembayaran untuk setiap metode pembayaran
    for (const payment of payments) {
      if (payment.status === "SUCCESS") {
        await prisma.pembayaranTransaksi.updateMany({
          where: {
            transaksiPenjualanId: transaction.id,
            metodePembayaran: payment.method,
          },
          data: {
            statusDetailPembayaran: "SUCCESS",
            referensiPembayaran: midtransTransactionId || payment.midtransToken,
          },
        });
      }
    }

    // Periksa apakah semua pembayaran sudah berhasil
    const allPaymentsSuccessful = payments.every(
      (p: any) => p.status === "SUCCESS"
    );

    // Jika semua pembayaran berhasil, update status transaksi menjadi SELESAI
    if (allPaymentsSuccessful) {
      await prisma.transaksiPenjualan.update({
        where: { id: transaction.id },
        data: { statusTransaksi: "SELESAI" },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Status pembayaran berhasil diperbarui",
    });
  } catch (error: any) {
    console.error("Error updating payment status:", error);
    return NextResponse.json(
      { error: error.message || "Gagal memperbarui status pembayaran" },
      { status: 500 }
    );
  }
}
