import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

// Schema for validating incoming data
const storeInfoSchema = z.object({
  namaToko: z.string().min(1, { message: "Nama Toko wajib diisi." }),
  alamatToko: z.string().min(1, { message: "Alamat Toko wajib diisi." }),
  kotaToko: z.string().optional(),
  provinsiToko: z.string().optional(),
  kodePosToko: z.string().optional(),
  teleponToko: z.string().optional(),
  emailToko: z
    .string()
    .email({ message: "Format email tidak valid." })
    .optional()
    .or(z.literal("")), // Allow empty string
  websiteToko: z
    .string()
    .url({ message: "Format URL tidak valid." })
    .optional()
    .or(z.literal("")), // Allow empty string
  npwpToko: z.string().optional(),
  urlLogoToko: z.string().optional(), // Assuming URL is stored as string
  headerStruk: z.string().optional(),
  footerStruk: z.string().optional(),
});

// GET handler to fetch store information
export async function GET() {
  try {
    // Assuming there is only one row for settings
    const settings = await prisma.pengaturanAplikasi.findFirst();

    if (!settings) {
      // Return a default empty structure if no settings found
      return NextResponse.json(
        {
          namaToko: "",
          alamatToko: "",
          kotaToko: "",
          provinsiToko: "",
          kodePosToko: "",
          teleponToko: "",
          emailToko: "",
          websiteToko: "",
          npwpToko: "",
          urlLogoToko: "",
          headerStruk: "",
          footerStruk: "",
        },
        { status: 200 }
      );
    }

    return NextResponse.json(settings, { status: 200 });
  } catch (error) {
    console.error("Error fetching store info:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST handler to update store information
export async function POST(request: Request) {
  try {
    // Handle multipart/form-data for file uploads
    const formData = await request.formData();

    // Extract form fields
    const data: { [key: string]: any } = {};
    for (const [key, value] of formData.entries()) {
      if (key !== "logoFile") {
        // Exclude the file itself from direct data processing
        data[key] = value;
      }
    }

    // Validate other form fields using the schema
    const validation = storeInfoSchema.safeParse(data);

    if (!validation.success) {
      return NextResponse.json(
        { message: "Invalid input", errors: validation.error.errors },
        { status: 400 }
      );
    }

    const validatedData = validation.data;
    let logoUrl: string | null = validatedData.urlLogoToko || null;

    // Handle file upload if a new file is provided
    const logoFile = formData.get("logoFile") as File | null;
    if (logoFile && logoFile.size > 0) {
      // Implement actual file saving logic
      // This is a basic implementation saving to a local 'public/uploads' directory.
      // For production, consider using a more robust storage solution like S3.
      try {
        const fs = require("fs").promises;
        const path = require("path");
        const uploadDir = path.join(process.cwd(), "public", "uploads");
        await fs.mkdir(uploadDir, { recursive: true });
        const filePath = path.join(uploadDir, logoFile.name);
        await fs.writeFile(filePath, Buffer.from(await logoFile.arrayBuffer()));
        logoUrl = `/uploads/${logoFile.name}`; // Update logoUrl with the public path
        console.log("File saved successfully:", filePath);
      } catch (uploadError) {
        console.error("Error saving file:", uploadError);
        // Decide how to handle upload errors - maybe return an error response
        // For now, we'll log and proceed without updating the logo URL if saving fails.
        logoUrl = validatedData.urlLogoToko || null; // Keep existing URL or null on error
      }
    }

    // Find the existing settings row or create a new one
    let settings = await prisma.pengaturanAplikasi.findFirst();

    const updateData = {
      namaToko: validatedData.namaToko,
      alamatToko: validatedData.alamatToko,
      kotaToko: validatedData.kotaToko,
      provinsiToko: validatedData.provinsiToko,
      kodePosToko: validatedData.kodePosToko,
      teleponToko: validatedData.teleponToko,
      emailToko: validatedData.emailToko || null,
      websiteToko: validatedData.websiteToko || null,
      npwpToko: validatedData.npwpToko || null,
      urlLogoToko: logoUrl, // Use the potentially updated logoUrl
      headerStruk: validatedData.headerStruk || null,
      footerStruk: validatedData.footerStruk || null,
    };

    if (settings) {
      // Update existing row
      settings = await prisma.pengaturanAplikasi.update({
        where: { id: settings.id }, // Assuming 'id' is the unique identifier
        data: updateData,
      });
    } else {
      // Create new row (should only happen on first save)
      settings = await prisma.pengaturanAplikasi.create({
        data: updateData,
      });
    }

    return NextResponse.json(settings, { status: 200 });
  } catch (error) {
    console.error("Error saving store info:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
