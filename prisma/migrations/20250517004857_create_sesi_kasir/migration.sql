-- CreateTable
CREATE TABLE "tbl_kategori" (
    "IdKategori" SERIAL NOT NULL,
    "NamaKategori" VARCHAR(50) NOT NULL,
    "DeskripsiKategori" TEXT,

    CONSTRAINT "tbl_kategori_pkey" PRIMARY KEY ("IdKategori")
);

-- CreateTable
CREATE TABLE "tbl_supplier" (
    "IdSupplier" SERIAL NOT NULL,
    "NamaSupplier" VARCHAR(100) NOT NULL,
    "AlamatSupplier" TEXT,
    "NoTelpSupplier" VARCHAR(20),
    "EmailSupplier" VARCHAR(100),
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tbl_supplier_pkey" PRIMARY KEY ("IdSupplier")
);

-- CreateTable
CREATE TABLE "SesiKasir" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "waktuBuka" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modalAwal" DECIMAL(12,2) NOT NULL,
    "waktuTutup" TIMESTAMP(3),
    "totalPenjualanSistem" DECIMAL(14,2),
    "totalUangFisik" DECIMAL(14,2),
    "selisih" DECIMAL(12,2),
    "catatanSesi" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SesiKasir_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_item" (
    "ItemId" SERIAL NOT NULL,
    "NamaItem" VARCHAR(100) NOT NULL,
    "IdKategori" INTEGER,
    "HargaJual" DECIMAL(10,2) NOT NULL,
    "HargaBeli" DECIMAL(10,2),
    "Stok" INTEGER NOT NULL DEFAULT 0,
    "StokMinimum" INTEGER DEFAULT 0,
    "manufacture" VARCHAR(50),
    "KodeBarcode" VARCHAR(50),
    "IdSupplier" INTEGER,
    "satuan" VARCHAR(20) DEFAULT 'Pcs',

    CONSTRAINT "tbl_item_pkey" PRIMARY KEY ("ItemId")
);

-- CreateTable
CREATE TABLE "tbl_pelanggan" (
    "IdPelanggan" SERIAL NOT NULL,
    "NamaPelanggan" VARCHAR(100) NOT NULL,
    "JK" VARCHAR(10),
    "NoPhone" VARCHAR(20),
    "alamat" TEXT,
    "email" VARCHAR(100),
    "PoinLoyalitas" INTEGER DEFAULT 0,
    "TanggalRegistrasi" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tbl_pelanggan_pkey" PRIMARY KEY ("IdPelanggan")
);

-- CreateTable
CREATE TABLE "TransaksiPenjualan" (
    "id" TEXT NOT NULL,
    "nomorStruk" TEXT NOT NULL,
    "pelangganId" INTEGER,
    "userId" TEXT NOT NULL,
    "tanggalWaktuTransaksi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subtotalSebelumDiskonPajak" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "totalDiskonTransaksi" DECIMAL(15,2) DEFAULT 0.00,
    "totalPajak" DECIMAL(15,2) DEFAULT 0.00,
    "grandTotal" DECIMAL(15,2) NOT NULL,
    "statusPembayaran" TEXT NOT NULL DEFAULT 'PENDING_PAYMENT_GATEWAY',
    "statusTransaksi" TEXT NOT NULL DEFAULT 'MENUNGGU_PEMBAYARAN_PG',
    "paymentGatewayName" TEXT,
    "paymentGatewayOrderId" TEXT,
    "perluDiantar" BOOLEAN NOT NULL DEFAULT false,
    "alamatPengiriman" TEXT,
    "kotaPengiriman" TEXT,
    "kodePosPengiriman" TEXT,
    "noTelpPenerima" TEXT,
    "catatanPengiriman" TEXT,
    "biayaPengiriman" DECIMAL(10,2) DEFAULT 0.00,
    "sesiKasirId" TEXT,
    "catatanTransaksi" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransaksiPenjualan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MidtransWebhookLog" (
    "id" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "midtransOrderId" TEXT,
    "midtransTransactionId" TEXT,
    "transactionStatus" TEXT,
    "paymentType" TEXT,
    "statusCode" TEXT,
    "grossAmount" TEXT,
    "requestBody" JSONB NOT NULL,
    "processingStatus" TEXT,
    "errorMessage" TEXT,

    CONSTRAINT "MidtransWebhookLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PembayaranTransaksi" (
    "id" TEXT NOT NULL,
    "transaksiPenjualanId" TEXT NOT NULL,
    "metodePembayaran" TEXT NOT NULL,
    "jumlahDibayar" DECIMAL(15,2) NOT NULL,
    "paymentGatewayPaymentId" TEXT,
    "statusDetailPembayaran" TEXT NOT NULL DEFAULT 'PENDING',
    "transactionType" TEXT NOT NULL DEFAULT 'Payment',
    "channel" TEXT,
    "amount" DECIMAL(15,2),
    "paymentGatewayResponseDetails" JSONB,
    "waktuPembayaran" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PembayaranTransaksi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_detail_transaksi_penjualan" (
    "IdDetailTransaksi" SERIAL NOT NULL,
    "IdTransaksi" TEXT NOT NULL,
    "ItemId" INTEGER NOT NULL,
    "NamaItemSaatTransaksi" VARCHAR(100) NOT NULL,
    "Jumlah" INTEGER NOT NULL,
    "HargaJualSaatTransaksi" DECIMAL(10,2) NOT NULL,
    "DiskonItemPersen" DECIMAL(5,2) DEFAULT 0.00,
    "DiskonItemNominal" DECIMAL(10,2) DEFAULT 0.00,
    "Subtotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "tbl_detail_transaksi_penjualan_pkey" PRIMARY KEY ("IdDetailTransaksi")
);

-- CreateTable
CREATE TABLE "tbl_pembelian_ke_supplier" (
    "IdPembelian" SERIAL NOT NULL,
    "NomorPO" VARCHAR(50),
    "NomorFakturSupplier" VARCHAR(50),
    "IdSupplier" INTEGER NOT NULL,
    "IdUserPenerima" INTEGER NOT NULL,
    "TanggalPesan" TIMESTAMP(3),
    "TanggalJatuhTempo" TIMESTAMP(3),
    "TanggalTerima" TIMESTAMP(3),
    "SubtotalPembelian" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "DiskonPembelian" DECIMAL(12,2) DEFAULT 0.00,
    "PajakPembelian" DECIMAL(12,2) DEFAULT 0.00,
    "BiayaLain" DECIMAL(12,2) DEFAULT 0.00,
    "TotalPembelian" DECIMAL(12,2) NOT NULL,
    "StatusPembelian" VARCHAR(20) NOT NULL DEFAULT 'Pending',
    "catatan" TEXT,

    CONSTRAINT "tbl_pembelian_ke_supplier_pkey" PRIMARY KEY ("IdPembelian")
);

-- CreateTable
CREATE TABLE "tbl_detail_pembelian_ke_supplier" (
    "IdDetailPembelian" SERIAL NOT NULL,
    "IdPembelian" INTEGER NOT NULL,
    "ItemId" INTEGER NOT NULL,
    "JumlahPesan" INTEGER NOT NULL,
    "JumlahTerima" INTEGER DEFAULT 0,
    "HargaBeliSatuan" DECIMAL(10,2) NOT NULL,
    "Subtotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "tbl_detail_pembelian_ke_supplier_pkey" PRIMARY KEY ("IdDetailPembelian")
);

-- CreateTable
CREATE TABLE "tbl_penyesuaian_stok" (
    "IdPenyesuaian" SERIAL NOT NULL,
    "NomorReferensi" VARCHAR(50),
    "ItemId" INTEGER NOT NULL,
    "IdUser" INTEGER NOT NULL,
    "TanggalPenyesuaian" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "JenisPenyesuaian" VARCHAR(20) NOT NULL,
    "TipeOperasi" VARCHAR(10) NOT NULL,
    "Jumlah" INTEGER NOT NULL,
    "StokSebelum" INTEGER NOT NULL,
    "StokSesudah" INTEGER NOT NULL,
    "keterangan" TEXT,

    CONSTRAINT "tbl_penyesuaian_stok_pkey" PRIMARY KEY ("IdPenyesuaian")
);

-- CreateIndex
CREATE UNIQUE INDEX "tbl_kategori_NamaKategori_key" ON "tbl_kategori"("NamaKategori");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_item_KodeBarcode_key" ON "tbl_item"("KodeBarcode");

-- CreateIndex
CREATE INDEX "idx_item_nama" ON "tbl_item"("NamaItem");

-- CreateIndex
CREATE INDEX "idx_item_barcode" ON "tbl_item"("KodeBarcode");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_pelanggan_email_key" ON "tbl_pelanggan"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TransaksiPenjualan_nomorStruk_key" ON "TransaksiPenjualan"("nomorStruk");

-- CreateIndex
CREATE UNIQUE INDEX "TransaksiPenjualan_paymentGatewayOrderId_key" ON "TransaksiPenjualan"("paymentGatewayOrderId");

-- CreateIndex
CREATE INDEX "MidtransWebhookLog_midtransOrderId_idx" ON "MidtransWebhookLog"("midtransOrderId");

-- CreateIndex
CREATE INDEX "MidtransWebhookLog_midtransTransactionId_idx" ON "MidtransWebhookLog"("midtransTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "PembayaranTransaksi_paymentGatewayPaymentId_key" ON "PembayaranTransaksi"("paymentGatewayPaymentId");

-- CreateIndex
CREATE INDEX "PembayaranTransaksi_transaksiPenjualanId_idx" ON "PembayaranTransaksi"("transaksiPenjualanId");

-- CreateIndex
CREATE INDEX "idx_detail_transaksi_idtransaksi" ON "tbl_detail_transaksi_penjualan"("IdTransaksi");

-- CreateIndex
CREATE INDEX "idx_detail_transaksi_itemid" ON "tbl_detail_transaksi_penjualan"("ItemId");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_pembelian_ke_supplier_NomorPO_key" ON "tbl_pembelian_ke_supplier"("NomorPO");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_penyesuaian_stok_NomorReferensi_key" ON "tbl_penyesuaian_stok"("NomorReferensi");

-- AddForeignKey
ALTER TABLE "tbl_item" ADD CONSTRAINT "tbl_item_IdKategori_fkey" FOREIGN KEY ("IdKategori") REFERENCES "tbl_kategori"("IdKategori") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_item" ADD CONSTRAINT "tbl_item_IdSupplier_fkey" FOREIGN KEY ("IdSupplier") REFERENCES "tbl_supplier"("IdSupplier") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransaksiPenjualan" ADD CONSTRAINT "TransaksiPenjualan_pelangganId_fkey" FOREIGN KEY ("pelangganId") REFERENCES "tbl_pelanggan"("IdPelanggan") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransaksiPenjualan" ADD CONSTRAINT "TransaksiPenjualan_sesiKasirId_fkey" FOREIGN KEY ("sesiKasirId") REFERENCES "SesiKasir"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PembayaranTransaksi" ADD CONSTRAINT "PembayaranTransaksi_transaksiPenjualanId_fkey" FOREIGN KEY ("transaksiPenjualanId") REFERENCES "TransaksiPenjualan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_detail_transaksi_penjualan" ADD CONSTRAINT "tbl_detail_transaksi_penjualan_IdTransaksi_fkey" FOREIGN KEY ("IdTransaksi") REFERENCES "TransaksiPenjualan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_detail_transaksi_penjualan" ADD CONSTRAINT "tbl_detail_transaksi_penjualan_ItemId_fkey" FOREIGN KEY ("ItemId") REFERENCES "tbl_item"("ItemId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_pembelian_ke_supplier" ADD CONSTRAINT "tbl_pembelian_ke_supplier_IdSupplier_fkey" FOREIGN KEY ("IdSupplier") REFERENCES "tbl_supplier"("IdSupplier") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_detail_pembelian_ke_supplier" ADD CONSTRAINT "tbl_detail_pembelian_ke_supplier_IdPembelian_fkey" FOREIGN KEY ("IdPembelian") REFERENCES "tbl_pembelian_ke_supplier"("IdPembelian") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_detail_pembelian_ke_supplier" ADD CONSTRAINT "tbl_detail_pembelian_ke_supplier_ItemId_fkey" FOREIGN KEY ("ItemId") REFERENCES "tbl_item"("ItemId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_penyesuaian_stok" ADD CONSTRAINT "tbl_penyesuaian_stok_ItemId_fkey" FOREIGN KEY ("ItemId") REFERENCES "tbl_item"("ItemId") ON DELETE RESTRICT ON UPDATE CASCADE;
