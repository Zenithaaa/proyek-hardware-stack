// app/api/webhooks/midtrans/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { snap, coreApi } from "@/lib/midtrans"; // Asumsi Anda juga export coreApi untuk verifikasi
import crypto from "crypto"; // Untuk verifikasi signature manual jika perlu

// Fungsi untuk verifikasi signature (contoh manual, library midtrans-client mungkin punya cara lebih baik)
// const verifySignature = (notificationBody: any, serverKey: string): boolean => {
//   const { order_id, status_code, gross_amount, signature_key } = notificationBody;
//   if (!order_id || !status_code || !gross_amount || !signature_key) return false;
//   const expectedSignature = crypto
//     .createHash('sha512')
//     .update(`<span class="math-inline">\{order\_id\}</span>{status_code}<span class="math-inline">\{gross\_amount\}</span>{serverKey}`)
//     .digest('hex');
//   return signature_key === expectedSignature;
// };

export async function POST(request: NextRequest) {
  try {
    const notificationJson = await request.json();
    console.log(
      "Received Midtrans Webhook:",
      JSON.stringify(notificationJson, null, 2)
    );

    // (Opsional tapi direkomendasikan) Simpan raw webhook ke tabel MidtransWebhookLog
    // const log = await prisma.midtransWebhookLog.create({ data: { requestBody: notificationJson }});

    // 1. Verifikasi Notifikasi menggunakan fungsi dari library midtrans-client
    // Ini cara yang lebih disarankan dan aman.
    // 'coreApi.transaction.notification' akan melempar error jika signature tidak valid
    // atau jika order_id tidak ditemukan di Midtrans (untuk fraud_status).
    // Pastikan serverKey di instance coreApi sudah benar.
    // Cara ini mungkin memerlukan konfigurasi coreApi yang sedikit berbeda.
    // Alternatifnya, Anda bisa mengambil status langsung dari Midtrans setelah verifikasi dasar.

    // Mari kita coba cara verifikasi yang lebih umum dan aman:
    // Ambil status transaksi langsung dari Midtrans menggunakan order_id dari notifikasi
    // Ini memastikan kita mendapatkan status terbaru dan terverifikasi dari Midtrans.

    const midtransOrderId = notificationJson.order_id;
    const transactionStatusResponse = await snap.transaction.status(
      midtransOrderId
    );
    // atau jika pakai coreApi: await coreApi.transaction.status(midtransOrderId);

    console.log(
      "Midtrans Transaction Status Response:",
      transactionStatusResponse
    );

    // Update log dengan hasil verifikasi (jika menggunakan tabel log)
    // await prisma.midtransWebhookLog.update({ where: { id: log.id }, data: { isVerified: true, midtransOrderId, transactionStatus: transactionStatusResponse.transaction_status }});

    const order_id = transactionStatusResponse.order_id; // Ini adalah ID yang Anda kirim ke Midtrans
    const transaction_status = transactionStatusResponse.transaction_status;
    const fraud_status = transactionStatusResponse.fraud_status;
    const payment_type = transactionStatusResponse.payment_type;
    const gross_amount = parseFloat(transactionStatusResponse.gross_amount); // Pastikan tipe data sesuai
    const midtransTransactionId = transactionStatusResponse.transaction_id; // ID unik dari Midtrans

    // 2. Cari transaksi di database Anda berdasarkan order_id
    // Ingat, order_id yang Anda kirim ke Midtrans bisa jadi adalah idTransaksiInternal Anda
    // atau gabungan idTransaksiInternal + UUID. Sesuaikan pencariannya.
    // Jika `order_id` dari Midtrans adalah `idTransaksiInternal-${uuid}`
    const idTransaksiInternal = order_id.split("-")[0]; // Ambil bagian ID internalnya

    const existingTransaction = await prisma.transaksiPenjualan.findUnique({
      where: { id: idTransaksiInternal },
      include: { detailTransaksiPenjualan: { include: { item: true } } }, // Untuk update stok
    });

    if (!existingTransaction) {
      console.error(
        `Webhook Error: Transaksi dengan ID Internal ${idTransaksiInternal} (dari Midtrans Order ID ${order_id}) tidak ditemukan.`
      );
      // await prisma.midtransWebhookLog.update({ where: { id: log.id }, data: { processingStatus: 'ERROR_NOT_FOUND' }});
      return NextResponse.json(
        { status: "error", message: "Transaction not found" },
        { status: 404 }
      );
    }

    // 3. Update Status Transaksi di Database Anda (Idempotency Check)
    // Hindari memproses notifikasi yang sama berulang kali jika statusnya sudah final.
    if (
      existingTransaction.statusPembayaran === "PAID_VIA_MIDTRANS" &&
      (transaction_status === "capture" || transaction_status === "settlement")
    ) {
      console.log(`Transaksi ${order_id} sudah pernah diproses sebagai PAID.`);
      return NextResponse.json({ status: "ok", message: "Already processed" });
    }

    let newStatusPembayaran = existingTransaction.statusPembayaran;
    let newStatusTransaksi = existingTransaction.statusTransaksi;

    if (transaction_status == "capture" || transaction_status == "settlement") {
      // Pembayaran berhasil (capture untuk kartu, settlement untuk metode lain)
      // Pastikan fraud_status juga aman jika relevan (misal, 'accept')
      if (
        fraud_status == "accept" ||
        fraud_status == "challenge" ||
        !fraud_status
      ) {
        // challenge mungkin perlu review manual
        newStatusPembayaran = "PAID_VIA_MIDTRANS";
        newStatusTransaksi = "SELESAI";

        // Kurangi Stok Barang
        for (const detail of existingTransaction.detailTransaksiPenjualan) {
          await prisma.item.update({
            where: { id: detail.itemId },
            data: { stok: { decrement: detail.jumlah } },
          });
        }

        // Catat detail pembayaran ke tbl_pembayaran_transaksi
        await prisma.pembayaranTransaksi.create({
          data: {
            transaksiPenjualanId: existingTransaction.id,
            metodePembayaran: payment_type.toUpperCase() + "_MIDTRANS", // e.g. GOPAY_MIDTRANS
            jumlahDibayar: gross_amount,
            paymentGatewayPaymentId: midtransTransactionId,
            statusDetailPembayaran: "SUCCESS",
            waktuPembayaran: new Date(
              transactionStatusResponse.transaction_time || Date.now()
            ),
            paymentGatewayResponseDetails: transactionStatusResponse as any, // Simpan seluruh respons
          },
        });
      } else if (fraud_status == "deny") {
        newStatusPembayaran = "FRAUD_DETECTED_MIDTRANS";
        newStatusTransaksi = "DIBATALKAN";
      }
    } else if (transaction_status == "pending") {
      newStatusPembayaran = "PENDING_PAYMENT_GATEWAY";
      newStatusTransaksi = "MENUNGGU_PEMBAYARAN_PG";
    } else if (
      transaction_status == "deny" ||
      transaction_status == "cancel" ||
      transaction_status == "expire"
    ) {
      newStatusPembayaran = transaction_status.toUpperCase() + "_MIDTRANS"; // FAILED_MIDTRANS, CANCELLED_MIDTRANS, EXPIRED_MIDTRANS
      newStatusTransaksi = "DIBATALKAN";
    }
    // Tambahkan logika untuk status lainnya dari Midtrans jika perlu

    await prisma.transaksiPenjualan.update({
      where: { id: existingTransaction.id },
      data: {
        statusPembayaran: newStatusPembayaran,
        statusTransaksi: newStatusTransaksi,
        paymentGatewayOrderId: order_id, // Pastikan ini terisi
        paymentGatewayName: "Midtrans",
      },
    });

    // await prisma.midtransWebhookLog.update({ where: { id: log.id }, data: { processingStatus: 'SUCCESS' }});
    return NextResponse.json({
      status: "ok",
      message: "Webhook processed successfully",
    });
  } catch (error: any) {
    console.error("Error processing Midtrans webhook:", error.message || error);
    // if (log) {
    //   await prisma.midtransWebhookLog.update({ where: { id: log.id }, data: { processingStatus: 'ERROR_PROCESSING', errorMessage: error.message }});
    // }
    return NextResponse.json(
      { status: "error", message: "Internal server error" },
      { status: 500 }
    );
  }
}
