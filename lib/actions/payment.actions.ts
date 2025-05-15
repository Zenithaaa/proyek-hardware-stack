// lib/actions/payment.actions.ts
"use server";

import { prisma } from "@/lib/db"; // atau '@/lib/db' sesuai nama file Prisma client Anda
import { snap } from "@/lib/midtrans"; // Import snap instance yang sudah dikonfigurasi
import { v4 as uuidv4 } from "uuid"; // Untuk generate ID order unik jika perlu

interface OrderItem {
  id: string; // ID barang dari sistem Anda
  price: number;
  quantity: number;
  name: string;
}

interface CustomerDetails {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  // tambahkan billing_address, shipping_address jika perlu
}

interface InitiatePaymentArgs {
  idTransaksiInternal: string; // ID transaksi dari tabel TransaksiPenjualan Anda
  grandTotal: number;
  items: OrderItem[];
  customer?: CustomerDetails;
  enabledPayments?: string[]; // Opsional: batasi metode pembayaran
}

export async function initiateMidtransPayment({
  idTransaksiInternal,
  grandTotal,
  items,
  customer,
  enabledPayments,
}: InitiatePaymentArgs) {
  try {
    // 1. (PENTING) Pastikan transaksi sudah tercatat di DB Anda dengan status PENDING
    // Anda mungkin sudah melakukan ini sebelum memanggil action ini, atau lakukan di sini.
    // Contoh:
    // const existingTransaction = await prisma.transaksiPenjualan.findUnique({
    //   where: { id: idTransaksiInternal },
    // });
    // if (!existingTransaction || existingTransaction.statusPembayaran !== 'PENDING_PAYMENT_GATEWAY') {
    //   throw new Error('Transaksi tidak valid atau status tidak sesuai untuk pembayaran.');
    // }

    // 2. Siapkan parameter untuk Midtrans Snap API
    // Pastikan order_id unik untuk setiap upaya pembayaran ke Midtrans,
    // Anda bisa menggunakan idTransaksiInternal atau gabungan dengan timestamp/UUID.
    // Midtrans merekomendasikan order_id yang unik untuk setiap request createTransaction.
    const midtransOrderId = `${idTransaksiInternal}-${uuidv4()}`;

    const parameter = {
      transaction_details: {
        order_id: midtransOrderId, // ID Order Unik untuk Midtrans
        gross_amount: Math.round(grandTotal), // Midtrans memerlukan integer atau pembulatan
      },
      item_details: items.map((item) => ({
        id: item.id,
        price: Math.round(item.price),
        quantity: item.quantity,
        name: item.name.substring(0, 50), // Nama item maks 50 karakter
      })),
      customer_details: customer,
      enabled_payments: enabledPayments, // Contoh: ['credit_card', 'gopay', 'shopeepay', 'qris']
      // Tambahkan callback URL jika perlu (biasanya tidak perlu jika Anda hanya mengandalkan Snap.js callbacks & webhook)
      // callbacks: {
      //   finish: `<span class="math-inline">\{process\.env\.NEXT\_PUBLIC\_BASE\_URL\}/order/</span>{idTransaksiInternal}/status` // URL redirect setelah pembayaran
      // }
    };

    // 3. Panggil Midtrans API untuk mendapatkan token Snap
    const transactionToken = await snap.createTransactionToken(parameter);

    // 4. (Opsional) Simpan midtransOrderId atau referensi lain ke transaksi Anda di DB
    // Ini bisa berguna untuk rekonsiliasi sebelum webhook datang.
    await prisma.transaksiPenjualan.update({
      where: { id: idTransaksiInternal },
      data: {
        paymentGatewayName: "Midtrans",
        // Simpan midtransOrderId yang dikirim ke Midtrans agar bisa dicocokkan dengan webhook
        // Jika order_id di Midtrans adalah idTransaksiInternal Anda, kolom ini mungkin tidak perlu lagi.
        // Atau, jika Midtrans mengembalikan ID order mereka sendiri yang berbeda, simpan itu.
        // Untuk Snap, order_id yang Anda kirim adalah referensi utama.
      },
    });

    return {
      success: true,
      token: transactionToken,
      midtransOrderId: midtransOrderId,
    };
  } catch (error: any) {
    console.error(
      "Error creating Midtrans transaction:",
      error.message || error
    );
    // Log error lebih detail jika perlu
    return {
      success: false,
      error: "Gagal memulai pembayaran dengan Midtrans.",
      details: error.message,
    };
  }
}
