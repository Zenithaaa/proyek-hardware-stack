"use client";

import { useState, useEffect } from "react";
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
    namaKontak?: string | null;
    kota?: string | null;
    kodePos?: string | null;
    catatan?: string | null;
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
      namaKontak: supplier?.namaKontak || "",
      noTelp: supplier?.noTelp || "",
      email: supplier?.email || "",
      alamat: supplier?.alamat || "",
      kota: supplier?.kota || "",
      kodePos: supplier?.kodePos || "",
      catatan: supplier?.catatan || "",
    },
  });

  // Reset form when supplier prop changes (for edit mode)
  useEffect(() => {
    if (supplier) {
      form.reset(supplier);
    } else {
      form.reset(); // Reset to empty when adding new supplier
    }
  }, [supplier, form]);

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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto mx-4 md:mx-auto">
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="noTelp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nomor Telepon</FormLabel>
                    <FormControl>
                      <Input placeholder="Masukkan nomor telepon" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Masukkan email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>

            {/* Removed NPWP, Nomor Rekening, Nama Bank Fields */}

            <FormField
              control={form.control}
              name="alamat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alamat Lengkap</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Masukkan alamat lengkap"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="catatan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Catatan Tambahan</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Masukkan catatan tambahan"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {supplier ? "Simpan Perubahan" : "Tambah Supplier"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
