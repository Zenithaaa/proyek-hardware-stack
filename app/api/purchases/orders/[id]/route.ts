import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params; // Await params
    const poId = parseInt(id, 10);

    if (isNaN(poId)) {
      return NextResponse.json({ error: "Invalid PO ID" }, { status: 400 });
    }

    // Check if the PO exists before attempting to delete
    const existingPO = await prisma.pembelianKeSupplier.findUnique({
      where: {
        id: poId,
      },
    });

    if (!existingPO) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    // Delete associated detail items first
    await prisma.detailPembelianKeSupplier.deleteMany({
      where: {
        pembelianId: poId,
      },
    });

    // Delete the purchase order
    await prisma.pembelianKeSupplier.delete({
      where: {
        id: poId,
      },
    });

    return NextResponse.json({
      message: "Purchase order deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting purchase order:", error);
    return NextResponse.json(
      { error: "Failed to delete purchase order" },
      { status: 500 }
    );
  }
}
