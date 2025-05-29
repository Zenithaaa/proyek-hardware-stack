import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const poData = await req.json();

    // Basic validation
    if (!poData.supplierId || !poData.items || poData.items.length === 0) {
      return NextResponse.json(
        { error: "Supplier and items are required" },
        { status: 400 }
      );
    }

    // Create Purchase Order Header
    const newPO = await prisma.pembelianKeSupplier.create({
      data: {
        supplierId: poData.supplierId,
        nomorPO: poData.nomorPO || `PO-${Date.now()}`, // Generate if not provided
        tanggalPesan: new Date(poData.tanggalPesan),
        tanggalJatuhTempo: poData.tanggalJatuhTempo
          ? new Date(poData.tanggalJatuhTempo)
          : null,
        alamatPengirimanSupplier: poData.alamatPengirimanSupplier,
        syaratPembayaran: poData.syaratPembayaran,
        catatan: poData.catatan,
        subtotal: poData.subtotal,
        diskon: poData.diskon,
        pajak: poData.pajak,
        biayaLain: poData.biayaLain,
        total: poData.total,
        status: poData.status, // e.g., "Draft", "Dipesan"
        userPenerimaId: poData.userPenerimaId, // Ensure this is a valid user ID from your system
        // Add other fields as necessary based on your schema
      },
    });

    // Create Purchase Order Detail Items
    const poItemsData = poData.items.map((item: any) => ({
      pembelianId: newPO.id,
      itemId: item.itemId,
      jumlahPesan: item.jumlahPesan,
      hargaBeli: item.hargaBeli,
      subtotal: item.subtotal,
      // Add other fields as necessary based on your schema
    }));

    await prisma.detailPembelianKeSupplier.createMany({
      data: poItemsData,
    });

    return NextResponse.json({
      message: "Purchase Order saved successfully",
      po: newPO,
    });
  } catch (error) {
    console.error("Error saving purchase order:", error);
    return NextResponse.json(
      { error: "Failed to save purchase order" },
      { status: 500 }
    );
  }
}
