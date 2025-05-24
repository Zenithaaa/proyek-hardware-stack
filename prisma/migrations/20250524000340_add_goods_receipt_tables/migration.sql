-- CreateTable
CREATE TABLE "PenerimaanBarangHeader" (
    "id" TEXT NOT NULL,
    "nomorDokumen" TEXT NOT NULL,
    "tanggalPenerimaan" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pembelianKeSupplierId" INTEGER,
    "supplierId" INTEGER NOT NULL,
    "nomorSuratJalanSupplier" TEXT,
    "userIdPenerima" TEXT NOT NULL,
    "catatan" TEXT,
    "statusPenerimaan" TEXT DEFAULT 'DIPROSES',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PenerimaanBarangHeader_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PenerimaanBarangDetail" (
    "id" TEXT NOT NULL,
    "penerimaanBarangHeaderId" TEXT NOT NULL,
    "itemId" INTEGER NOT NULL,
    "detailPembelianKeSupplierId" INTEGER,
    "jumlahDiterima" INTEGER NOT NULL,
    "hargaBeliSaatTerima" DECIMAL(12,2),
    "nomorBatch" TEXT,
    "tanggalKadaluarsa" TIMESTAMP(3),
    "lokasiGudang" TEXT,
    "keteranganItem" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PenerimaanBarangDetail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PenerimaanBarangHeader_nomorDokumen_key" ON "PenerimaanBarangHeader"("nomorDokumen");

-- CreateIndex
CREATE INDEX "PenerimaanBarangHeader_pembelianKeSupplierId_idx" ON "PenerimaanBarangHeader"("pembelianKeSupplierId");

-- CreateIndex
CREATE INDEX "PenerimaanBarangHeader_supplierId_idx" ON "PenerimaanBarangHeader"("supplierId");

-- CreateIndex
CREATE INDEX "PenerimaanBarangHeader_userIdPenerima_idx" ON "PenerimaanBarangHeader"("userIdPenerima");

-- CreateIndex
CREATE INDEX "PenerimaanBarangHeader_tanggalPenerimaan_idx" ON "PenerimaanBarangHeader"("tanggalPenerimaan");

-- CreateIndex
CREATE INDEX "PenerimaanBarangDetail_penerimaanBarangHeaderId_idx" ON "PenerimaanBarangDetail"("penerimaanBarangHeaderId");

-- CreateIndex
CREATE INDEX "PenerimaanBarangDetail_itemId_idx" ON "PenerimaanBarangDetail"("itemId");

-- CreateIndex
CREATE INDEX "PenerimaanBarangDetail_detailPembelianKeSupplierId_idx" ON "PenerimaanBarangDetail"("detailPembelianKeSupplierId");

-- AddForeignKey
ALTER TABLE "PenerimaanBarangHeader" ADD CONSTRAINT "PenerimaanBarangHeader_pembelianKeSupplierId_fkey" FOREIGN KEY ("pembelianKeSupplierId") REFERENCES "tbl_pembelian_ke_supplier"("IdPembelian") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PenerimaanBarangHeader" ADD CONSTRAINT "PenerimaanBarangHeader_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "tbl_supplier"("IdSupplier") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PenerimaanBarangDetail" ADD CONSTRAINT "PenerimaanBarangDetail_penerimaanBarangHeaderId_fkey" FOREIGN KEY ("penerimaanBarangHeaderId") REFERENCES "PenerimaanBarangHeader"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PenerimaanBarangDetail" ADD CONSTRAINT "PenerimaanBarangDetail_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "tbl_item"("ItemId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PenerimaanBarangDetail" ADD CONSTRAINT "PenerimaanBarangDetail_detailPembelianKeSupplierId_fkey" FOREIGN KEY ("detailPembelianKeSupplierId") REFERENCES "tbl_detail_pembelian_ke_supplier"("IdDetailPembelian") ON DELETE SET NULL ON UPDATE CASCADE;
