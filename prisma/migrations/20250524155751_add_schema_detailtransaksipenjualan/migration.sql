-- AlterTable
ALTER TABLE "tbl_detail_transaksi_penjualan" ADD COLUMN     "HargaBeliSaatTransaksi" DECIMAL(12,2),
ALTER COLUMN "HargaJualSaatTransaksi" SET DATA TYPE DECIMAL(12,2);
