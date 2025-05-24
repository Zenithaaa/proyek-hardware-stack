/*
  Warnings:

  - You are about to drop the column `NPWPSupplier` on the `tbl_supplier` table. All the data in the column will be lost.
  - You are about to drop the column `NamaBankSupplier` on the `tbl_supplier` table. All the data in the column will be lost.
  - You are about to drop the column `NoRekeningSupplier` on the `tbl_supplier` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "tbl_supplier" DROP COLUMN "NPWPSupplier",
DROP COLUMN "NamaBankSupplier",
DROP COLUMN "NoRekeningSupplier";
