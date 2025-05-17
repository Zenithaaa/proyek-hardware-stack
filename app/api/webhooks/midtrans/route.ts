// app/api/webhooks/midtrans/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import snap from "@/lib/midtrans"; // Import snap dari lib/midtrans
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

    // Simpan raw webhook ke tabel MidtransWebhookLog untuk audit trail
    let log = await prisma.midtransWebhookLog.create({
      data: {
        requestBody: notificationJson,
        receivedAt: new Date(),
        isVerified: false,
        processingStatus: "RECEIVED",
      },
    });

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

    // Update log dengan hasil verifikasi
    await prisma.midtransWebhookLog.update({
      where: { id: log.id },
      data: {
        isVerified: true,
        midtransOrderId,
        midtransTransactionId: transactionStatusResponse.transaction_id,
        transactionStatus: transactionStatusResponse.transaction_status,
        paymentType: transactionStatusResponse.payment_type,
        statusCode: transactionStatusResponse.status_code,
        grossAmount: transactionStatusResponse.gross_amount,
      },
    });

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

    // Coba cari transaksi berdasarkan ID internal terlebih dahulu
    let existingTransaction = await prisma.transaksiPenjualan.findUnique({
      where: { id: idTransaksiInternal },
      include: { detailTransaksiPenjualan: { include: { item: true } } }, // Untuk update stok
    });

    // Jika tidak ditemukan berdasarkan ID internal, coba cari berdasarkan paymentGatewayOrderId
    if (!existingTransaction) {
      existingTransaction = await prisma.transaksiPenjualan.findFirst({
        where: { paymentGatewayOrderId: order_id },
        include: { detailTransaksiPenjualan: { include: { item: true } } },
      });
    }

    // Jika masih tidak ditemukan, coba cari berdasarkan nomorStruk
    // Ini untuk kasus di mana order_id adalah nomorStruk
    if (!existingTransaction) {
      existingTransaction = await prisma.transaksiPenjualan.findUnique({
        where: { nomorStruk: order_id },
        include: { detailTransaksiPenjualan: { include: { item: true } } },
      });
    }

    if (!existingTransaction) {
      console.error(
        `Webhook Error: Transaksi dengan Midtrans Order ID ${order_id} tidak ditemukan.`
      );
      await prisma.midtransWebhookLog.update({
        where: { id: log.id },
        data: {
          processingStatus: "ERROR_NOT_FOUND",
          errorMessage: `Transaksi dengan Midtrans Order ID ${order_id} tidak ditemukan`,
        },
      });
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

      // Update log dengan status sukses meskipun tidak ada perubahan
      await prisma.midtransWebhookLog.update({
        where: { id: log.id },
        data: { processingStatus: "SUCCESS_ALREADY_PROCESSED" },
      });

      return NextResponse.json({ status: "ok", message: "Already processed" });
    }

    let newStatusPembayaran = existingTransaction.statusPembayaran;
    let newStatusTransaksi = existingTransaction.statusTransaksi;

    // Cek apakah sudah ada pembayaran dengan ID yang sama untuk menghindari duplikasi
    const existingPayment = await prisma.pembayaranTransaksi.findFirst({
      where: {
        paymentGatewayPaymentId: midtransTransactionId,
      },
    });

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

        // Kurangi Stok Barang jika belum dikurangi sebelumnya
        if (existingTransaction.statusPembayaran !== "PAID_VIA_MIDTRANS") {
          for (const detail of existingTransaction.detailTransaksiPenjualan) {
            await prisma.item.update({
              where: { id: detail.itemId },
              data: { stok: { decrement: detail.jumlah } },
            });
          }
        }

        // Catat detail pembayaran ke tbl_pembayaran_transaksi jika belum ada
        if (!existingPayment) {
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
              channel:
                transactionStatusResponse.channel || payment_type.toUpperCase(),
              amount: gross_amount,
            },
          });
        }
      } else if (fraud_status == "deny") {
        newStatusPembayaran = "FRAUD_DETECTED_MIDTRANS";
        newStatusTransaksi = "DIBATALKAN";
      }
    } else if (transaction_status == "pending") {
      newStatusPembayaran = "PENDING_PAYMENT_GATEWAY";
      newStatusTransaksi = "MENUNGGU_PEMBAYARAN_PG";

      // Catat pembayaran pending jika belum ada
      if (!existingPayment) {
        await prisma.pembayaranTransaksi.create({
          data: {
            transaksiPenjualanId: existingTransaction.id,
            metodePembayaran: payment_type.toUpperCase() + "_MIDTRANS",
            jumlahDibayar: gross_amount,
            paymentGatewayPaymentId: midtransTransactionId,
            statusDetailPembayaran: "PENDING",
            waktuPembayaran: new Date(
              transactionStatusResponse.transaction_time || Date.now()
            ),
            paymentGatewayResponseDetails: transactionStatusResponse as any,
            channel:
              transactionStatusResponse.channel || payment_type.toUpperCase(),
            amount: gross_amount,
          },
        });
      }
    } else if (
      transaction_status == "deny" ||
      transaction_status == "cancel" ||
      transaction_status == "expire"
    ) {
      newStatusPembayaran = transaction_status.toUpperCase() + "_MIDTRANS"; // FAILED_MIDTRANS, CANCELLED_MIDTRANS, EXPIRED_MIDTRANS
      newStatusTransaksi = "DIBATALKAN";

      // Update status pembayaran jika sudah ada
      if (existingPayment) {
        await prisma.pembayaranTransaksi.update({
          where: { id: existingPayment.id },
          data: {
            statusDetailPembayaran: transaction_status.toUpperCase(),
            paymentGatewayResponseDetails: transactionStatusResponse as any,
          },
        });
      } else {
        // Catat pembayaran gagal jika belum ada
        await prisma.pembayaranTransaksi.create({
          data: {
            transaksiPenjualanId: existingTransaction.id,
            metodePembayaran: payment_type.toUpperCase() + "_MIDTRANS",
            jumlahDibayar: gross_amount,
            paymentGatewayPaymentId: midtransTransactionId,
            statusDetailPembayaran: transaction_status.toUpperCase(),
            waktuPembayaran: new Date(
              transactionStatusResponse.transaction_time || Date.now()
            ),
            paymentGatewayResponseDetails: transactionStatusResponse as any,
            channel:
              transactionStatusResponse.channel || payment_type.toUpperCase(),
            amount: gross_amount,
          },
        });
      }
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

    await prisma.midtransWebhookLog.update({
      where: { id: log.id },
      data: { processingStatus: "SUCCESS" },
    });
    return NextResponse.json({
      status: "ok",
      message: "Webhook processed successfully",
    });
  } catch (error: any) {
    console.error("Error processing Midtrans webhook:", error.message || error);
    try {
      // Coba simpan log error jika log sudah dibuat sebelumnya
      if (typeof log !== "undefined" && log?.id) {
        await prisma.midtransWebhookLog.update({
          where: { id: log.id },
          data: {
            processingStatus: "ERROR_PROCESSING",
            errorMessage: error.message || "Unknown error occurred",
          },
        });
      } else {
        // Jika log belum dibuat, buat log error baru
        await prisma.midtransWebhookLog.create({
          data: {
            requestBody: { error: error.message || "Unknown error occurred" },
            receivedAt: new Date(),
            isVerified: false,
            processingStatus: "ERROR_PROCESSING",
            errorMessage: error.message || "Unknown error occurred",
          },
        });
      }
    } catch (logError) {
      console.error("Error saving webhook log:", logError);
    }
    return NextResponse.json(
      { status: "error", message: "Internal server error" },
      { status: 500 }
    );
  }
}
