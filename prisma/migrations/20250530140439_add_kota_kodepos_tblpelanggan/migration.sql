/*
  Warnings:

  - The `statusPenerimaan` column on the `PenerimaanBarangHeader` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "StatusPenerimaan" AS ENUM ('LENGKAP_SESUAI_PO', 'SEBAGIAN_DITERIMA', 'TANPA_PO');

-- AlterTable
ALTER TABLE "PenerimaanBarangHeader" DROP COLUMN "statusPenerimaan",
ADD COLUMN     "statusPenerimaan" "StatusPenerimaan";

-- AlterTable
ALTER TABLE "tbl_pelanggan" ADD COLUMN     "catatan" TEXT,
ADD COLUMN     "kodePos" TEXT,
ADD COLUMN     "kota" TEXT;
