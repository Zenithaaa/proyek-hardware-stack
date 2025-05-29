import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: { supplierId: string } }
) {
  try {
    const { supplierId: supplierIdParam } = await params;
    const supplierId = parseInt(supplierIdParam, 10);

    if (isNaN(supplierId)) {
      return NextResponse.json(
        { success: false, error: "Invalid Supplier ID" },
        { status: 400 }
      );
    }

    const purchaseOrders = await prisma.pembelianKeSupplier.findMany({
      where: {
        supplierId: supplierId,
      },
      select: {
        id: true,
        nomorPO: true,
        tanggalPesan: true, // Use tanggalPesan as the date field
        supplierId: true, // Correct field name
      },
      orderBy: {
        tanggalPesan: "desc",
      },
    });

    // Map tanggalPesan to tanggalPembelian for consistency with frontend type
    const formattedPurchaseOrders = purchaseOrders.map((po) => ({
      id: po.id.toString(),
      nomorPO: po.nomorPO || "-",
      tanggalPembelian: po.tanggalPesan?.toISOString() || "", // Use tanggalPesan
      idSupplier: po.supplierId.toString(), // Use the correct field name here
    }));

    return NextResponse.json({ success: true, data: formattedPurchaseOrders });
  } catch (error) {
    console.error("Error fetching purchase orders by supplier:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch purchase orders" },
      { status: 500 }
    );
  }
}
