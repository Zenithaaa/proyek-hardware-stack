import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const suppliers = await prisma.supplier.findMany({
      select: {
        id: true,
        nama: true,
      },
      orderBy: {
        nama: "asc",
      },
    });

    return NextResponse.json({ data: suppliers }, { status: 200 });
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    return NextResponse.json(
      { error: "Failed to fetch suppliers" },
      { status: 500 }
    );
  }
}
