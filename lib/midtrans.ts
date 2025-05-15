// lib/midtrans.ts
import midtransClient from "midtrans-client";

const serverKey = process.env.MIDTRANS_SERVER_KEY_SANDBOX || ""; // Ganti dengan Production saat live
const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY_SANDBOX || ""; // Ganti dengan Production saat live
const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";

// Inisialisasi Snap API (untuk popup pembayaran yang mudah)
export const snap = new midtransClient.Snap({
  isProduction: isProduction,
  serverKey: serverKey,
  clientKey: clientKey,
});

// Anda juga bisa inisialisasi CoreApi jika butuh kontrol lebih detail
// export const coreApi = new midtransClient.CoreApi({
//     isProduction: isProduction,
//     serverKey: serverKey,
//     clientKey: clientKey
// });

export default snap; // Export snap sebagai default atau sesuai kebutuhan
