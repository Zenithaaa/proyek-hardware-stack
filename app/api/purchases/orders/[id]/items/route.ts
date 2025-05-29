import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: poIdParam } = await params;
    const poId = parseInt(poIdParam, 10);

    if (isNaN(poId)) {
      return NextResponse.json(
        { success: false, error: "Invalid PO ID" },
        { status: 400 }
      );
    }

    const poItems = await prisma.detailPembelianKeSupplier.findMany({
      where: {
        pembelianId: poId,
      },
      include: {
        item: {
          // Include the related Item model
          select: {
            nama: true,
            kodeBarcode: true, // Assuming kode is kodeBarcode
            satuan: true,
          },
        },
      },
    });

    const formattedPOItems = poItems.map((item) => ({
      id: item.id.toString(), // Ensure ID is string
      idItem: item.itemId.toString(), // Ensure ID is string
      namaItem: item.item.nama,
      kodeItem: item.item.kodeBarcode || "-", // Use kodeBarcode
      jumlahDipesan: item.jumlahPesan,
      jumlahDiterima: item.jumlahTerima || 0, // Assuming jumlahTerima exists and defaults to 0
      satuan: item.item.satuan || "-",
      hargaBeli: item.hargaBeli.toNumber(), // Convert Decimal to Number
    }));

    return NextResponse.json({ success: true, data: formattedPOItems });
  } catch (error) {
    console.error("Error fetching PO items:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch PO items" },
      { status: 500 }
    );
  }
}
