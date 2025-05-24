/*
  Warnings:

  - You are about to drop the column `IdUser` on the `tbl_penyesuaian_stok` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "tbl_penyesuaian_stok_IdUser_idx";

-- AlterTable
ALTER TABLE "tbl_penyesuaian_stok" DROP COLUMN "IdUser";
