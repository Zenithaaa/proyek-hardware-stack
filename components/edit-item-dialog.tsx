"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarcodeGenerator, generateRandomBarcode } from "./barcode-generator";
import {
  createItemSchema,
  type CreateItemPayload,
} from "@/lib/schemas/item.schema";
import { updateItemAction } from "@/lib/actions/item.actions";
import { Pencil } from "lucide-react";

interface EditItemDialogProps {
  item: {
    id: number;
    nama: string;
    kategori?: { id: number; nama: string };
    supplier?: { id: number; nama: string };
    hargaJual: number;
    hargaBeli?: number;
    stok: number;
    stokMinimum?: number;
    kodeBarcode?: string;
    satuan?: string;
  };
  kategoriData?: Array<{ id: number; nama: string }>;
  supplierData?: Array<{ id: number; nama: string }>;
  onSuccess?: () => void;
}

export function EditItemDialog({
  item,
  kategoriData = [],
  supplierData = [],
  onSuccess,
}: EditItemDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [generatedBarcode, setGeneratedBarcode] = React.useState(
    item.kodeBarcode || ""
  );

  const form = useForm<CreateItemPayload>({
    resolver: zodResolver(createItemSchema),
    defaultValues: {
      nama: item.nama,
      kategoriId: item.kategori?.id || null,
      hargaJual: item.hargaJual,
      hargaBeli: item.hargaBeli || null,
      stok: item.stok,
      stokMinimum: item.stokMinimum || null,
      kodeBarcode: item.kodeBarcode || null,
      supplierId: item.supplier?.id || null,
      satuan: item.satuan || "Pcs",
    },
  });

  const handleGenerateBarcode = () => {
    const newBarcode = generateRandomBarcode();
    setGeneratedBarcode(newBarcode);
    form.setValue("kodeBarcode", newBarcode);
  };

  const onSubmit = async (data: CreateItemPayload) => {
    setIsSubmitting(true);
    try {
      const result = await updateItemAction(item.id, data);
      if (result.success) {
        toast.success("Item berhasil diperbarui");
        setOpen(false);
        onSuccess?.();
      } else {
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, errors]) => {
            form.setError(field as keyof CreateItemPayload, {
              type: "manual",
              message: errors[0],
            });
          });
        }
        toast.error(result.message || "Gagal memperbarui item");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan saat memperbarui item");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md w-[90vw] mx-auto p-4 sm:p-6 md:p-8 overflow-y-auto max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Edit Barang</DialogTitle>
          <DialogDescription>
            Ubah informasi barang dalam inventaris.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nama"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Barang</FormLabel>
                  <FormControl>
                    <Input placeholder="Masukkan nama barang" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-auto max-h-[70vh] w-full">
              <FormField
                control={form.control}
                name="kategoriId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategori</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih kategori" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {kategoriData.map((kategori) => (
                          <SelectItem
                            key={kategori.id}
                            value={kategori.id.toString()}
                          >
                            {kategori.nama}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih supplier" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {supplierData.map((supplier) => (
                          <SelectItem
                            key={supplier.id}
                            value={supplier.id.toString()}
                          >
                            {supplier.nama}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-auto max-h-[70vh] w-full">
              <FormField
                control={form.control}
                name="hargaBeli"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Harga Beli</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Masukkan harga beli"
                        {...field}
                        value={
                          field.value ? field.value.toLocaleString("id-ID") : ""
                        }
                        onChange={(e) => {
                          const rawValue = e.target.value.replace(/\./g, "");
                          const numberValue = rawValue
                            ? parseInt(rawValue, 10)
                            : null;
                          field.onChange(numberValue);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hargaJual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Harga Jual</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Masukkan harga jual"
                        {...field}
                        value={
                          field.value ? field.value.toLocaleString("id-ID") : ""
                        }
                        onChange={(e) => {
                          const rawValue = e.target.value.replace(/\./g, "");
                          const numberValue = rawValue
                            ? parseInt(rawValue, 10)
                            : undefined;
                          field.onChange(numberValue);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-auto max-h-[70vh] w-full">
              <FormField
                control={form.control}
                name="stok"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stok</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Masukkan jumlah stok"
                        {...field}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? Number(e.target.value) : 0
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="stokMinimum"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stok Minimum</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Masukkan stok minimum"
                        {...field}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-auto max-h-[70vh] w-full">
              <FormField
                control={form.control}
                name="kodeBarcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kode Barcode</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Masukkan kode barcode"
                        {...field}
                        value={field.value || ""}
                        readOnly
                      />
                    </FormControl>
                    {generatedBarcode && (
                      <div className="mt-2">
                        <BarcodeGenerator
                          value={generatedBarcode}
                          width={1.5}
                          height={50}
                        />
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="satuan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Satuan</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Pcs"
                        {...field}
                        value={field.value || "Pcs"}
                        readOnly
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
