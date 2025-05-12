import { NextResponse } from "next/server";
import { exportToExcel, exportToPDF } from "@/lib/utils/excel";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format");

    if (!format) {
      return NextResponse.json(
        { error: "Format export tidak ditentukan" },
        { status: 400 }
      );
    }

    let data: Blob;
    let contentType: string;
    let filename: string;

    if (format === "excel") {
      data = await exportToExcel();
      contentType =
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      filename = "inventaris.xlsx";
    } else if (format === "pdf") {
      data = await exportToPDF();
      contentType = "application/pdf";
      filename = "inventaris.pdf";
    } else {
      return NextResponse.json(
        { error: "Format tidak didukung" },
        { status: 400 }
      );
    }

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Content-Disposition", `attachment; filename=${filename}`);

    return new NextResponse(data, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Error in export route:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengexport data" },
      { status: 500 }
    );
  }
}
