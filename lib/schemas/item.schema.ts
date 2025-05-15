// File: lib/schemas/item.schema.ts
import { z } from "zod";

export const createItemSchema = z.object({
  nama: z.string().min(3, "Nama item minimal 3 karakter"),
  kategoriId: z.preprocess((val) => {
    if (typeof val === "string" && val.trim() === "") return null;
    if (val === undefined || val === null) return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  }, z.number().int().positive("Kategori harus dipilih")),
  hargaJual: z.preprocess((val) => {
    if (typeof val === "string" && val.trim() === "") return undefined;
    if (val === undefined) return undefined;
    const num = Number(val);
    return isNaN(num) ? undefined : num;
  }, z.number().positive("Harga jual harus positif")),
  hargaBeli: z.preprocess((val) => {
    if (typeof val === "string" && val.trim() === "") return null;
    if (val === undefined || val === null) return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  }, z.number().positive("Harga beli harus positif")),
  stok: z.preprocess((val) => {
    if (typeof val === "string" && val.trim() === "") return 0;
    if (val === undefined || val === null) return 0;
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  }, z.number().int().min(0, "Stok tidak boleh negatif")),
  stokMinimum: z.preprocess((val) => {
    if (typeof val === "string" && val.trim() === "") return null;
    if (val === undefined || val === null) return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  }, z.number().int().min(0, "Stok minimum tidak boleh negatif").optional().nullable()),
  manufacture: z
    .string()
    .optional()
    .nullable()
    .transform((val) => {
      if (typeof val === "string" && val.trim() === "") return null;
      return val;
    }),
  kodeBarcode: z
    .string()
    .optional()
    .nullable()
    .transform((val) => {
      if (typeof val === "string" && val.trim() === "") return null;
      return val;
    }),
  supplierId: z.preprocess((val) => {
    if (typeof val === "string" && val.trim() === "") return null;
    if (val === undefined || val === null) return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  }, z.number().int().positive().optional().nullable()),
  satuan: z
    .string()
    .optional()
    .nullable()
    .transform((val) => {
      if (typeof val === "string" && val.trim() === "") return "Pcs";
      if (val === undefined || val === null) return "Pcs";
      return val;
    }),
});

export type CreateItemPayload = z.infer<typeof createItemSchema>;
