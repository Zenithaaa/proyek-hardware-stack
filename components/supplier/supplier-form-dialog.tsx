"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import {
  supplierSchema,
  type SupplierFormValues,
} from "@/lib/schemas/supplier.schema";
import {
  createSupplierAction,
  updateSupplierAction,
} from "@/lib/actions/supplier.actions";

type SupplierFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: {
    id: number;
    nama: string;
    alamat?: string | null;
    noTelp?: string | null;
    email?: string | null;
  };
  onSuccess?: () => void;
};

export function SupplierFormDialog({
  open,
  onOpenChange,
  supplier,
  onSuccess,
}: SupplierFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!supplier;

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      nama: supplier?.nama || "",
      namaKontak: "",
      noTelp: supplier?.noTelp || "",
      email: supplier?.email || "",
      alamat: supplier?.alamat || "",
      kota: "",
      kodePos: "",
      npwp: "",
      noRekening: "",
      namaBank: "",
      catatan: "",
    },
  });

  async function onSubmit(data: SupplierFormValues) {
    setIsSubmitting(true);

    try {
      const response = isEditMode
        ? await updateSupplierAction(supplier.id, data)
        : await createSupplierAction(data);

      if (!response.success) {
        if (response.fieldErrors) {
          // Set field errors
          Object.entries(response.fieldErrors).forEach(([field, errors]) => {
            form.setError(field as any, {
              type: "manual",
              message: errors[0],
            });
          });
        } else {
          toast.error(response.message || "Terjadi kesalahan");
        }
        return;
      }

      toast.success(
        isEditMode
          ? "Supplier berhasil diperbarui"
          : "Supplier berhasil ditambahkan"
      );
      onOpenChange(false);
      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Terjadi kesalahan saat menyimpan data");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode
              ? `Edit Supplier: ${supplier.nama}`
              : "Tambah Supplier Baru"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Perbarui informasi supplier di bawah ini."
              : "Isi formulir di bawah untuk menambahkan supplier baru."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nama Supplier */}
              <FormField
                control={form.control}
                name="nama"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Supplier</FormLabel>
                    <FormControl>
                      <Input placeholder="Masukkan nama supplier" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Nama Kontak Person */}
              <FormField
                control={form.control}
                name="namaKontak"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Kontak Person</FormLabel>
                    <FormControl>
                      <Input placeholder="Masukkan nama kontak" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Nomor Telepon */}
              <FormField
                control={form.control}
                name="noTelp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nomor Telepon</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="Masukkan nomor telepon"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Masukkan email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Kota */}
              <FormField
                control={form.control}
                name="kota"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kota</FormLabel>
                    <FormControl>
                      <Input placeholder="Masukkan kota" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Kode Pos */}
              <FormField
                control={form.control}
                name="kodePos"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kode Pos</FormLabel>
                    <FormControl>
                      <Input placeholder="Masukkan kode pos" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* NPWP */}
              <FormField
                control={form.control}
                name="npwp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NPWP</FormLabel>
                    <FormControl>
                      <Input placeholder="Masukkan NPWP" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Nomor Rekening */}
              <FormField
                control={form.control}
                name="noRekening"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nomor Rekening</FormLabel>
                    <FormControl>
                      <Input placeholder="Masukkan nomor rekening" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Nama Bank */}
              <FormField
                control={form.control}
                name="namaBank"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Bank</FormLabel>
                    <FormControl>
                      <Input placeholder="Masukkan nama bank" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Alamat Lengkap */}
            <FormField
              control={form.control}
              name="alamat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alamat Lengkap</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Masukkan alamat lengkap"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Catatan Tambahan */}
            <FormField
              control={form.control}
              name="catatan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Catatan Tambahan</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Masukkan catatan tambahan"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Simpan Supplier"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
