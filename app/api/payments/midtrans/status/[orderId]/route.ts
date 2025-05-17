// app/api/payments/midtrans/status/[orderId]/route.ts
import { NextResponse } from "next/server";
import { snap } from "@/lib/midtrans";

export async function GET(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params;

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID tidak ditemukan" },
        { status: 400 }
      );
    }

    // Dapatkan status transaksi dari Midtrans
    const transactionStatus = await snap.transaction.status(orderId);

    return NextResponse.json({
      status: transactionStatus.transaction_status,
      fraud_status: transactionStatus.fraud_status,
      payment_type: transactionStatus.payment_type,
      transaction_id: transactionStatus.transaction_id,
      transaction_time: transactionStatus.transaction_time,
      gross_amount: transactionStatus.gross_amount,
    });
  } catch (error: any) {
    console.error("Error checking Midtrans payment status:", error);
    return NextResponse.json(
      { error: error.message || "Gagal mengecek status pembayaran" },
      { status: 500 }
    );
  }
}
