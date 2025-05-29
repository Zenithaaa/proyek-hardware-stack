import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const suppliers = await prisma.supplier.findMany();
    const items = await prisma.item.findMany();

    return NextResponse.json({ suppliers, items });
  } catch (error) {
    console.error("Error fetching data for new purchase order:", error);
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}
