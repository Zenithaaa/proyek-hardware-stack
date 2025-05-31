import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      idSupplier,
      idPembelian,
      tanggalPenerimaan,
      nomorSuratJalanSupplier,
      catatanPenerimaan,
      items,
    } = body;

    // Basic validation (more robust validation should be done on the frontend and/or with a validation library)
    if (
      !idSupplier ||
      !tanggalPenerimaan ||
      !nomorSuratJalanSupplier ||
      !items ||
      items.length === 0
    ) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Ensure supplierId and idPembelian (if not null) are integers
    const supplierIdInt = parseInt(idSupplier, 10);
    const pembelianIdInt = idPembelian ? parseInt(idPembelian, 10) : null;

    if (
      isNaN(supplierIdInt) ||
      (idPembelian !== null && isNaN(pembelianIdInt as number))
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid ID format" },
        { status: 400 }
      );
    }

    // Start a transaction to ensure atomicity
    const result = await prisma.$transaction(async (prisma) => {
      // 1. Create the PenerimaanBarangHeader
      const newReceiptHeader = await prisma.penerimaanBarangHeader.create({
        data: {
          nomorDokumen: `RCV-${Date.now()}`, // Simple unique document number generation
          tanggalPenerimaan: new Date(tanggalPenerimaan),
          supplierId: supplierIdInt,
          pembelianKeSupplierId: pembelianIdInt,
          nomorSuratJalanSupplier: nomorSuratJalanSupplier,
          catatan: catatanPenerimaan,

        },
      });

      // 2. Create PenerimaanBarangDetail records
      const detailItemsData = items.map((item: any) => ({
        penerimaanBarangHeaderId: newReceiptHeader.id,
        itemId: parseInt(item.idItem, 10), // Ensure itemId is integer
        detailPembelianKeSupplierId: item.idDetailPembelian
          ? parseInt(item.idDetailPembelian, 10)
          : null, // Ensure idDetailPembelian is integer or null
        jumlahDiterima: parseInt(item.jumlahDiterima, 10), // Ensure jumlahDiterima is integer
        hargaBeliSaatTerima: new Prisma.Decimal(item.hargaBeliSaatTerima), // Use Prisma.Decimal
        // Add other relevant fields like nomorBatch, tanggalKadaluarsa, lokasiGudang if needed
      }));

      await prisma.penerimaanBarangDetail.createMany({
        data: detailItemsData,
      });

      // 3. Update jumlahTerima in DetailPembelianKeSupplier if it's a PO-based receipt
      if (pembelianIdInt !== null) {
        for (const item of items) {
          if (item.idDetailPembelian) {
            await prisma.detailPembelianKeSupplier.update({
              where: {
                id: parseInt(item.idDetailPembelian, 10),
              },
              data: {
                jumlahTerima: {
                  increment: parseInt(item.jumlahDiterima, 10),
                },
              },
            });
          }
        }

        // Optional: Update status of PembelianKeSupplier if all items are fully received
        const poDetails = await prisma.detailPembelianKeSupplier.findMany({
          where: {
            pembelianId: pembelianIdInt,
          },
        });

        const allItemsFullyReceived = poDetails.every(
          (detail) => detail.jumlahTerima >= detail.jumlahPesan
        );

        let poStatus = "Diterima Sebagian"; // Default status if not fully received
        if (allItemsFullyReceived) {
          poStatus = "Diterima Lengkap";
        }

        await prisma.pembelianKeSupplier.update({
          where: {
            id: pembelianIdInt,
          },
          data: {
           status: poStatus,
          },
        });

        // Update the status of the PenerimaanBarangHeader based on the final PO status
        await prisma.penerimaanBarangHeader.update({
          where: {
            id: newReceiptHeader.id,
          },
          data: {
            statusPenerimaan: pembelianIdInt ? (allItemsFullyReceived ? 'LENGKAP_SESUAI_PO' : 'SEBAGIAN_DITERIMA') : 'TANPA_PO',
          },
        });

      }

      return newReceiptHeader;
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Error creating receipt:", error);
    // Handle specific Prisma errors if necessary
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle known errors, e.g., unique constraint violation
      return NextResponse.json(
        { success: false, error: `Database Error: ${error.message}` },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to create receipt" },
      { status: 500 }
    );
  }
}
