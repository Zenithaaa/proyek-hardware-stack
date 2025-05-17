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
  deliveryNote?: string;
  deliveryFee: number;
  payments: {
    method: "CASH" | "DEBIT_CREDIT" | "QRIS" | "E_WALLET";
    amount: number;
  }[];
  sesiKasirId?: string;
};

export async function createTransaction(data: CreateTransactionPayload) {
  try {
    const transaction = await prisma.transaksiPenjualan.create({
      data: {
        userId: data.userId,
        pelangganId: data.pelangganId,
        nomorStruk: `TRX_${Date.now()}`,
        subtotalSebelumDiskonPajak: data.cart.reduce(
          (acc, item) => acc + item.subtotal,
          0
        ),
        grandTotal:
          data.cart.reduce((acc, item) => acc + item.subtotal, 0) +
          data.deliveryFee,
        perluDiantar: data.needDelivery,
        alamatPengiriman: data.deliveryAddress,
        catatanPengiriman: data.deliveryNote,
        biayaPengiriman: data.deliveryFee,
        sesiKasirId: data.sesiKasirId,
        statusTransaksi: "PROSES",
        detailTransaksiPenjualan: {
          create: data.cart.map((item) => ({
            itemId: item.id,
            namaItemSaatTransaksi: item.name,
            jumlah: item.quantity,
            hargaJualSaatTransaksi: item.price,
            diskonItemNominal: item.discount,
            subtotal: item.subtotal,
          })),
        },
        pembayaranTransaksi: {
          create: data.payments.map((payment) => ({
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
