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
import { createItemAction } from "@/lib/actions/item.actions";

interface AddItemDialogProps {
  kategoriData?: Array<{ id: number; nama: string }>;
  supplierData?: Array<{ id: number; nama: string }>;
  onSuccess?: () => void;
}

export function AddItemDialog({
  kategoriData = [],
  supplierData = [],
  onSuccess,
}: AddItemDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [generatedBarcode, setGeneratedBarcode] = React.useState("");

  const form = useForm<CreateItemPayload>({
    resolver: zodResolver(createItemSchema),
    defaultValues: {
      nama: "",
      kategoriId: null,
      hargaJual: undefined,
      hargaBeli: null,
      stok: 0,
      stokMinimum: null,
      manufacture: null,
      kodeBarcode: null,
      supplierId: null,
      satuan: "Pcs",
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
      const result = await createItemAction(data);
      if (result.success) {
        toast.success("Item berhasil ditambahkan");
        form.reset();
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
        toast.error(result.message || "Gagal menambahkan item");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan saat menambahkan item");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Tambah Barang</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md mx-auto p-4 sm:p-6 md:p-8 max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tambah Barang Baru</DialogTitle>
          <DialogDescription>
            Isi informasi barang yang akan ditambahkan ke inventaris.
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
                    <Input
                      placeholder="Masukkan nama barang"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="kategoriId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategori</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pilih kategori" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Pilih kategori</SelectItem>
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
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pilih supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Pilih supplier</SelectItem>
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
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="hargaBeli"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Harga Beli</FormLabel>
                    <Input
                      type="number"
                      placeholder="Masukkan harga beli"
                      {...field}
                    />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hargaJual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Harga Jual</FormLabel>
                    <Input
                      type="number"
                      placeholder="Masukkan harga jual"
                      {...field}
                    />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="stok"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stok Awal</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Masukkan stok awal"
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

              <FormField
                control={form.control}
                name="satuan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Satuan</FormLabel>
                    <Input placeholder="Masukkan satuan" {...field} readOnly />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="manufacture"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Manufacture</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Masukkan manufacture"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="kodeBarcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kode Barcode</FormLabel>
                    <div className="flex flex-col sm:flex-row gap-2 w-full">
                      <FormControl>
                        <Input
                          placeholder="Masukkan kode barcode"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value || null)
                          }
                          className="w-full"
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleGenerateBarcode}
                        className="w-full sm:w-auto"
                      >
                        Generate
                      </Button>
                    </div>
                    {(field.value || generatedBarcode) && (
                      <div className="mt-2 w-full overflow-hidden flex justify-center">
                        <div className="w-full max-w-xs mx-auto">
                          <BarcodeGenerator
                            value={field.value || generatedBarcode}
                            width={1.5}
                            height={50}
                          />
                          <div className="text-center text-xs mt-1">
                            {field.value || generatedBarcode}
                          </div>
                        </div>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2">
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
