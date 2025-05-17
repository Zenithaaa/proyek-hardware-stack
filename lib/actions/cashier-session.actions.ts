"use server";

import prisma from "@/src/lib/db";

type CreateCashierSessionPayload = {
  userId: string;
  modalAwal?: number;
  catatanSesi?: string;
};

export async function createCashierSession(data: CreateCashierSessionPayload) {
  try {
    const sesiKasir = await prisma.sesiKasir.create({
      data: {
        userId: data.userId,
        modalAwal: data.modalAwal || 0,
        catatanSesi: data.catatanSesi,
      },
    });

    return { success: true, data: sesiKasir };
  } catch (error) {
    console.error("Error creating cashier session:", error);
    return { success: false, error: "Gagal membuat sesi kasir" };
  }
}

export async function getActiveCashierSessions() {
  try {
    const activeSessions = await prisma.sesiKasir.findMany({
      where: {
        waktuTutup: null,
      },
      orderBy: {
        waktuBuka: "desc",
      },
    });

    return { success: true, data: activeSessions };
  } catch (error) {
    console.error("Error fetching cashier sessions:", error);
    return { success: false, error: "Gagal mengambil data sesi kasir" };
  }
}

export async function closeCashierSession(
  id: string,
  data: { totalUangFisik: number; catatanSesi?: string }
) {
  try {
    // Ambil data transaksi untuk sesi ini
    const transactions = await prisma.transaksiPenjualan.findMany({
      where: {
        sesiKasirId: id,
        statusTransaksi: "SELESAI",
      },
    });

    // Hitung total penjualan dari transaksi
    const totalPenjualanSistem = transactions.reduce(
      (total, trx) => total + Number(trx.grandTotal),
      0
    );

    // Update sesi kasir
    const updatedSession = await prisma.sesiKasir.update({
      where: { id },
      data: {
        waktuTutup: new Date(),
        totalPenjualanSistem,
        totalUangFisik: data.totalUangFisik,
        selisih: data.totalUangFisik - totalPenjualanSistem,
        catatanSesi: data.catatanSesi,
      },
    });

    return { success: true, data: updatedSession };
  } catch (error) {
    console.error("Error closing cashier session:", error);
    return { success: false, error: "Gagal menutup sesi kasir" };
  }
}
