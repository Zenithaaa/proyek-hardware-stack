import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const items = await prisma.item.findMany({
      select: {
        id: true,
        nama: true,
        kodeBarcode: true, // Assuming kode is kodeBarcode
        satuan: true,
      },
      orderBy: {
        nama: "asc",
      },
    });

    // Map kodeBarcode to kode for consistency with frontend type
    const formattedItems = items.map((item) => ({
      id: item.id.toString(), // Ensure ID is string
      nama: item.nama,
      kode: item.kodeBarcode || "-", // Use kodeBarcode
      satuan: item.satuan || "-",
    }));

    return NextResponse.json({ success: true, data: formattedItems });
  } catch (error) {
    console.error("Error fetching items:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch items" },
      { status: 500 }
    );
  }
}
