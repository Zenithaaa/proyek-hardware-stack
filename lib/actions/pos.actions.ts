"use server";

import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

export const saveTransactionAction = async (transactionData: any) => {
  try {
    const result = await prisma.$transaction(async (prisma) => {
      // Create main transaction
      const newTransaction = await prisma.transaksiPenjualan.create({
        data: {
          nomorStruk: generateNomorStruk(),
          pelangganId: transactionData.pelangganId,
          userId: transactionData.userId,
          metodePembayaran: transactionData.metodePembayaran,
          subtotal: new Prisma.Decimal(transactionData.subtotal),
          totalDiskon: new Prisma.Decimal(transactionData.totalDiskon),
          totalPajak: new Prisma.Decimal(transactionData.totalPajak),
          grandTotal: new Prisma.Decimal(transactionData.grandTotal),
          jumlahBayar: new Prisma.Decimal(transactionData.jumlahBayar),
          kembalian: new Prisma.Decimal(transactionData.kembalian),
          catatan: transactionData.catatan,
          detailTransaksi: {
            create: transactionData.items.map((item: any) => ({
              itemId: item.itemId,
              namaItemSaatTransaksi: item.namaItemSaatTransaksi,
              jumlah: item.jumlah,
              hargaJualSaatTransaksi: new Prisma.Decimal(
                item.hargaJualSaatTransaksi
              ),
              diskonItemPersen: new Prisma.Decimal(item.diskonItemPersen),
              diskonItemNominal: new Prisma.Decimal(item.diskonItemNominal),
              subtotal: new Prisma.Decimal(item.subtotal),
            })),
          },
        },
        include: {
          detailTransaksi: true,
        },
      });

      // Update item stock
      for (const item of transactionData.items) {
        await prisma.item.update({
          where: { id: item.itemId },
          data: {
            stok: {
              decrement: item.jumlah,
            },
          },
        });
      }

      return newTransaction;
    });

    return {
      success: true,
      message: "Transaksi berhasil disimpan",
      nomorStruk: result.nomorStruk,
    };
  } catch (error) {
    console.error("Transaction error:", error);
    return {
      success: false,
      message: "Gagal menyimpan transaksi",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

function generateNomorStruk() {
  const date = new Date();
  const timestamp = date
    .toISOString()
    .replace(/[^0-9]/g, "")
    .slice(0, -5);
  const random = Math.random().toString(36).substring(2, 8);
  return `INV-${timestamp}-${random}`;
}
