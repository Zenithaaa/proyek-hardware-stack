"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/db";

type CreateTransactionPayload = {
  userId: string;
  pelangganId?: number;
  cart: {
    id: number;
    name: string;
    price: number;
    quantity: number;
    discount: number;
    subtotal: number;
  }[];
  needDelivery: boolean;
  deliveryAddress?: string;
  deliveryCity?: string;
  deliveryPostalCode?: string;
  deliveryRecipientPhone?: string;
  deliveryNote?: string;
  deliveryFee: number;
  payments: {
    method: "CASH" | "DEBIT_CREDIT" | "QRIS" | "E_WALLET";
    amount: number;
  }[];
  sesiKasirId?: string;
  discountPercent: number;
  taxPercent: number;
};

export async function createTransaction(data: CreateTransactionPayload) {
  try {
    // Validasi nilai numerik untuk mencegah overflow
    const MAX_NUMERIC_VALUE = 9999999999999.99; // Batas maksimum untuk field dengan precision 15, scale 2

    // Hitung subtotal dengan validasi
    const subtotal = data.cart.reduce((acc, item) => {
      const validSubtotal = Math.min(Number(item.subtotal), MAX_NUMERIC_VALUE);
      return acc + validSubtotal;
    }, 0);

    // Validasi dan hitung diskon transaksi
    const discountPercent =
      typeof data.discountPercent === "number" && !isNaN(data.discountPercent)
        ? data.discountPercent
        : 0;
    const totalDiskonTransaksi = Math.min(
      (subtotal * discountPercent) / 100,
      MAX_NUMERIC_VALUE
    );

    // Hitung subtotal setelah diskon
    const subtotalAfterDiscount = subtotal - totalDiskonTransaksi;

    // Validasi dan hitung pajak transaksi
    const taxPercent =
      typeof data.taxPercent === "number" && !isNaN(data.taxPercent)
        ? data.taxPercent
        : 0;
    const totalPajak = Math.min(
      (subtotalAfterDiscount * taxPercent) / 100,
      MAX_NUMERIC_VALUE
    );

    // Validasi deliveryFee
    const validDeliveryFee = Math.min(
      Number(data.deliveryFee), // Asumsi data.deliveryFee sudah divalidasi di frontend atau diubah menjadi number
      MAX_NUMERIC_VALUE
    );

    // Hitung grandTotal dengan validasi
    const grandTotal = Math.min(
      subtotalAfterDiscount + totalPajak + validDeliveryFee,
      MAX_NUMERIC_VALUE
    );

    // Validasi payment amounts
    const validatedPayments = data.payments.map((payment) => ({
      ...payment,
      amount: Math.min(Number(payment.amount), MAX_NUMERIC_VALUE),
    }));

    const transaction = await prisma.transaksiPenjualan.create({
      data: {
        userId: data.userId,
        pelangganId: data.pelangganId,
        nomorStruk: `TRX_${Date.now()}`,
        subtotalSebelumDiskonPajak: subtotal,
        totalDiskonTransaksi: totalDiskonTransaksi,
        totalPajak: totalPajak,
        grandTotal: grandTotal,
        perluDiantar: data.needDelivery,
        alamatPengiriman: data.deliveryAddress,
        kotaPengiriman: data.deliveryCity,
        kodePosPengiriman: data.deliveryPostalCode,
        noTelpPenerima: data.deliveryRecipientPhone,
        catatanPengiriman: data.deliveryNote,
        biayaPengiriman: validDeliveryFee,
        sesiKasirId: data.sesiKasirId,
        statusTransaksi: "SELESAI",
        detailTransaksiPenjualan: {
          create: data.cart.map((item) => ({
            itemId: item.id,
            namaItemSaatTransaksi: item.name,
            jumlah: item.quantity,
            hargaJualSaatTransaksi: Math.min(
              Number(item.price),
              MAX_NUMERIC_VALUE
            ),
            diskonItemNominal: Math.min(
              Number(item.discount),
              MAX_NUMERIC_VALUE
            ),
            subtotal: Math.min(Number(item.subtotal), MAX_NUMERIC_VALUE),
          })),
        },
        pembayaranTransaksi: {
          create: validatedPayments.map((payment) => ({
            metodePembayaran: payment.method,
            jumlahDibayar: payment.amount,
            transactionType: "Payment",
            statusDetailPembayaran:
              payment.method === "CASH" ? "SUCCESS" : "PENDING",
          })),
        },
      },
      include: {
        detailTransaksiPenjualan: true,
        pembayaranTransaksi: true,
      },
    });

    // Update stok barang
    for (const item of data.cart) {
      await prisma.item.update({
        where: { id: item.id },
        data: {
          stok: { decrement: item.quantity },
        },
      });
    }

    revalidatePath("/pos");
    return { success: true, data: transaction };
  } catch (error) {
    console.error("Error creating transaction:", error);
    return { success: false, error: "Gagal membuat transaksi" };
  }
}

export async function updateTransactionStatus(
  transactionId: string,
  status: string
) {
  try {
    const transaction = await prisma.transaksiPenjualan.update({
      where: { id: transactionId },
      data: { statusTransaksi: status },
    });

    revalidatePath("/pos");
    return { success: true, data: transaction };
  } catch (error) {
    console.error("Error updating transaction status:", error);
    return { success: false, error: "Gagal mengupdate status transaksi" };
  }
}

export async function updatePaymentStatus(paymentId: string, status: string) {
  try {
    const payment = await prisma.pembayaranTransaksi.update({
      where: { id: paymentId },
      data: { statusDetailPembayaran: status },
    });

    revalidatePath("/pos");
    return { success: true, data: payment };
  } catch (error) {
    console.error("Error updating payment status:", error);
    return { success: false, error: "Gagal mengupdate status pembayaran" };
  }
}
