import { NextResponse } from "next/server";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const applicationPreferencesSchema = z.object({
  // Pengaturan Pajak
  aktifkanPajak: z.boolean().optional(),
  namaPajak: z.string().optional().nullable(),
  persentasePajak: z.number().min(0).max(100).optional().nullable(),
  hargaTermasukPajak: z.boolean().optional(),

  // Format Nomor Dokumen
  prefixNomorStruk: z.string().optional().nullable(),
  panjangDigitNomorUrut: z.number().int().min(1).optional().nullable(),
  nomorStrukBerikutnya: z.number().int().min(0).optional().nullable(),

  // Pengaturan Mata Uang & Regional
  simbolMataUang: z.string().optional().nullable(),
  posisiSimbolMataUang: z.enum(["before", "after"]).optional().nullable(),
  jumlahDigitDesimal: z.number().int().min(0).optional().nullable(),
  pemisahRibuan: z.string().optional().nullable(),
  pemisahDesimal: z.string().optional().nullable(),

  // Preferensi Cetak Struk
  ukuranKertasStrukDefault: z.enum(["58mm", "80mm"]).optional().nullable(),
  cetakLogoDiStruk: z.boolean().optional(),
  otomatisCetakStruk: z.boolean().optional(),

  // Pengaturan Inventaris Default
  defaultNotifikasiStokMinimum: z.number().int().min(0).optional().nullable(),

  // Preferensi Tampilan Aplikasi
  temaAplikasi: z.enum(["system", "light", "dark"]).optional().nullable(),
  defaultJumlahItemPerHalaman: z.number().int().min(1).optional().nullable(),
});

export async function GET() {
  try {
    const preferences = await prisma.pengaturanAplikasi.findFirst();

    if (!preferences) {
      // Return default values if no preferences found
      return NextResponse.json({
        aktifkanPajak: false,
        namaPajak: null,
        persentasePajak: null,
        hargaTermasukPajak: false,
        prefixNomorStruk: null,
        panjangDigitNomorUrut: null,
        nomorStrukBerikutnya: null,
        simbolMataUang: null,
        posisiSimbolMataUang: null,
        jumlahDigitDesimal: null,
        pemisahRibuan: null,
        pemisahDesimal: null,
        ukuranKertasStrukDefault: null,
        cetakLogoDiStruk: false,
        otomatisCetakStruk: false,
        defaultNotifikasiStokMinimum: null,
        temaAplikasi: null,
        defaultJumlahItemPerHalaman: null,
      });
    }

    return NextResponse.json(preferences);
  } catch (error) {
    console.error("Error fetching application preferences:", error);
    return NextResponse.json(
      { message: "Failed to fetch application preferences", error },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validatedData = applicationPreferencesSchema.parse(body);

    // Find the first (and should be only) row in PengaturanAplikasi
    let preferences = await prisma.pengaturanAplikasi.findFirst();

    if (preferences) {
      // Update existing row
      preferences = await prisma.pengaturanAplikasi.update({
        where: { id: preferences.id },
        data: validatedData,
      });
    } else {
      // Create a new row if none exists
      preferences = await prisma.pengaturanAplikasi.create({
        data: validatedData,
      });
    }

    return NextResponse.json(preferences);
  } catch (error) {
    console.error("Error saving application preferences:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid data", errors: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: "Failed to save application preferences", error },
      { status: 500 }
    );
  }
}
