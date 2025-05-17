// app/api/payments/midtrans/initiate/route.ts
import { NextResponse } from "next/server";
import { snap } from "@/lib/midtrans";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, amount, paymentType, customerDetails } = body;

    // Validasi input
    if (!orderId || !amount || !paymentType) {
      return NextResponse.json(
        { error: "Data pembayaran tidak lengkap" },
        { status: 400 }
      );
    }

    // Parameter untuk Midtrans Snap
    const parameter: any = {
      transaction_details: {
        order_id: orderId,
        gross_amount: parseInt(amount.toString()), // Pastikan gross_amount adalah integer
      },
      credit_card: {
        secure: true,
      },
      customer_details: customerDetails || {},
      // Aktifkan semua metode pembayaran yang tersedia
      enabled_payments: [
        "credit_card",
        "gopay",
        "shopeepay",
        "dana",
        "qris",
        "bank_transfer",
        "echannel",
        "bca_va",
        "bni_va",
        "bri_va",
        "permata_va",
        "other_va",
        "alfamart",
        "indomaret",
      ],
    };

    // Tambahkan konfigurasi khusus berdasarkan payment_type yang dipilih user
    switch (paymentType.toLowerCase()) {
      case "qris":
        parameter.payment_type = "qris";
        // Tetap aktifkan semua metode, tapi prioritaskan QRIS
        break;
      case "gopay":
        parameter.payment_type = "gopay";
        // Tetap aktifkan semua metode, tapi prioritaskan gopay
        break;
      case "dana":
        parameter.payment_type = "dana";
        // Tetap aktifkan semua metode, tapi prioritaskan dana
        break;
      case "e_wallet":
        // Untuk e-wallet, tidak perlu set payment_type spesifik
        // agar semua e-wallet (GoPay, OVO, DANA, LinkAja, ShopeePay) tersedia
        break;
      case "bank_transfer":
        parameter.payment_type = "bank_transfer";
        parameter.bank_transfer = {
          bank: ["bca", "bni", "bri", "mandiri"],
        };
        break;
      case "debit_credit":
        // Tetap aktifkan semua metode, tapi prioritaskan kartu kredit
        break;
    }

    // Buat token transaksi
    const transaction = await snap.createTransaction(parameter);

    return NextResponse.json({
      token: transaction.token,
      redirectUrl: transaction.redirect_url,
    });
  } catch (error: any) {
    console.error("Error initiating Midtrans payment:", error);
    return NextResponse.json(
      { error: error.message || "Gagal memulai pembayaran" },
      { status: 500 }
    );
  }
}
