// components/print-receipt.tsx
import { forwardRef } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

// Types
type PrintReceiptProps = {
  data: {
    id: string;
    tanggal: Date;
    kasir: string;
    pelanggan?: {
      nama: string;
      alamat?: string;
      telepon?: string;
    };
    items: Array<{
      nama: string;
      harga: number;
      jumlah: number;
      diskon: number;
      subtotal: number;
    }>;
    subtotal: number;
    diskonTransaksi: number;
    biayaPengiriman: number;
    pajak: number;
    total: number;
    metodePembayaran: string;
    referensiPembayaran?: string;
  };
};

const PrintReceipt = forwardRef<HTMLDivElement, PrintReceiptProps>(
  ({ data }, ref) => {
    return (
      <div
        ref={ref}
        className="p-4 max-w-[80mm] mx-auto bg-white text-black text-sm"
        style={{ fontFamily: "monospace" }}
      >
        {/* Header Struk */}
        <div className="text-center mb-4">
          <h1 className="font-bold text-lg">TOKO HARDWARE</h1>
          <p>Jl. Contoh No. 123</p>
          <p>Telp: (021) 1234567</p>
          <div className="border-t border-b border-black my-2 py-2">
            <p>No. Transaksi: {data.id}</p>
            <p>
              Tanggal:{" "}
              {format(data.tanggal, "dd/MM/yyyy HH:mm", { locale: id })}
            </p>
            <p>Kasir: {data.kasir}</p>
          </div>
        </div>

        {/* Info Pelanggan (jika ada) */}
        {data.pelanggan && (
          <div className="mb-4">
            <p>Pelanggan: {data.pelanggan.nama}</p>
            {data.pelanggan.alamat && <p>Alamat: {data.pelanggan.alamat}</p>}
            {data.pelanggan.telepon && <p>Telepon: {data.pelanggan.telepon}</p>}
          </div>
        )}

        {/* Detail Item */}
        <div className="mb-4">
          <div className="border-b border-black mb-2">
            <p>DETAIL PEMBELIAN</p>
          </div>
          {data.items.map((item, index) => (
            <div key={index} className="mb-2">
              <p>{item.nama}</p>
              <p>
                {item.jumlah} x{" "}
                {new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  maximumFractionDigits: 0,
                }).format(item.harga)}
              </p>
              {item.diskon > 0 && (
                <p>
                  Diskon:{" "}
                  {new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                    maximumFractionDigits: 0,
                  }).format(item.diskon)}
                </p>
              )}
              <p className="text-right">
                {new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  maximumFractionDigits: 0,
                }).format(item.subtotal)}
              </p>
            </div>
          ))}
        </div>

        {/* Ringkasan Pembayaran */}
        <div className="border-t border-black pt-2">
          <div className="flex justify-between">
            <p>Subtotal:</p>
            <p>
              {new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
                maximumFractionDigits: 0,
              }).format(data.subtotal)}
            </p>
          </div>
          {data.diskonTransaksi > 0 && (
            <div className="flex justify-between">
              <p>Diskon:</p>
              <p>
                {new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  maximumFractionDigits: 0,
                }).format(data.diskonTransaksi)}
              </p>
            </div>
          )}
          {data.biayaPengiriman > 0 && (
            <div className="flex justify-between">
              <p>Biaya Kirim:</p>
              <p>
                {new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  maximumFractionDigits: 0,
                }).format(data.biayaPengiriman)}
              </p>
            </div>
          )}
          {data.pajak > 0 && (
            <div className="flex justify-between">
              <p>Pajak:</p>
              <p>
                {new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  maximumFractionDigits: 0,
                }).format(data.pajak)}
              </p>
            </div>
          )}
          <div className="flex justify-between font-bold border-t border-black mt-2 pt-2">
            <p>TOTAL:</p>
            <p>
              {new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
                maximumFractionDigits: 0,
              }).format(data.total)}
            </p>
          </div>
        </div>

        {/* Info Pembayaran */}
        <div className="mt-4 text-center">
          <p>Metode Pembayaran: {data.metodePembayaran}</p>
          {data.referensiPembayaran && <p>Ref: {data.referensiPembayaran}</p>}
        </div>

        {/* Footer */}
        <div className="mt-4 text-center">
          <p>Terima Kasih Atas Kunjungan Anda</p>
          <p>Barang yang sudah dibeli tidak dapat dikembalikan</p>
        </div>
      </div>
    );
  }
);

PrintReceipt.displayName = "PrintReceipt";

export default PrintReceipt;
