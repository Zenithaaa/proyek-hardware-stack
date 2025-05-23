import { z } from "zod";

export const supplierSchema = z.object({
  nama: z
    .string()
    .min(1, { message: "Nama supplier wajib diisi" })
    .max(100, { message: "Nama supplier maksimal 100 karakter" }),
  namaKontak: z
    .string()
    .max(100, { message: "Nama kontak maksimal 100 karakter" })
    .optional()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  noTelp: z
    .string()
    .max(20, { message: "Nomor telepon maksimal 20 karakter" })
    .optional()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  email: z
    .string()
    .email({ message: "Format email tidak valid" })
    .max(100, { message: "Email maksimal 100 karakter" })
    .optional()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  alamat: z
    .string()
    .max(500, { message: "Alamat maksimal 500 karakter" })
    .optional()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  kota: z
    .string()
    .max(100, { message: "Kota maksimal 100 karakter" })
    .optional()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  kodePos: z
    .string()
    .max(10, { message: "Kode pos maksimal 10 karakter" })
    .optional()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  npwp: z
    .string()
    .max(30, { message: "NPWP maksimal 30 karakter" })
    .optional()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  noRekening: z
    .string()
    .max(30, { message: "Nomor rekening maksimal 30 karakter" })
    .optional()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  namaBank: z
    .string()
    .max(50, { message: "Nama bank maksimal 50 karakter" })
    .optional()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  catatan: z
    .string()
    .max(500, { message: "Catatan maksimal 500 karakter" })
    .optional()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
});

export type SupplierFormValues = z.infer<typeof supplierSchema>;
