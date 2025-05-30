"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, PlusCircle, Trash } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const formSchema = z.object({
  nama: z.string().min(1, "Nama kategori wajib diisi"),
  description: z.string().optional(),
});

interface Category {
  id: string;
  nama: string;
  description?: string;
  _count: { items: number };
}

export default function CategoryPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingCategory, setEditingCategory] = useState<null | Category>(null);
  const queryClient = useQueryClient();

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCategories, setTotalCategories] = useState(0);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nama: "",
      description: "",
    },
  });

  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ["categories", page, pageSize], // Include page and pageSize in queryKey
    queryFn: async () => {
      const response = await fetch(
        `/api/inventory/categories?page=${page}&pageSize=${pageSize}`
      );
      if (!response.ok) {
        setTotalCategories(0);
        return [];
      }
      const result = await response.json();
      setTotalCategories(result.totalCategories);
      return Array.isArray(result.categories) ? result.categories : [];
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);
      const isEditing = editingCategory !== null;
      const res = await fetch(
        `/api/inventory/categories${
          isEditing ? `?id=${editingCategory.id}` : ""
        }`,
        {
          method: isEditing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        }
      );

      if (!res.ok)
        throw new Error(
          isEditing ? "Gagal mengupdate kategori" : "Gagal menyimpan kategori"
        );

      await queryClient.invalidateQueries({ queryKey: ["categories"] });
      form.reset();
      setEditingCategory(null);
      toast.success(
        isEditing
          ? "Kategori berhasil diupdate"
          : "Kategori berhasil ditambahkan"
      );
    } catch (error) {
      console.error("Error:", error);
      toast.error(
        "Gagal menyimpan kategori: " +
          (error instanceof Error ? error.message : "Terjadi kesalahan")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (categoryId: string) => {
    try {
      setIsDeleting(true); // Set deleting state
      const res = await fetch(`/api/inventory/categories?id=${categoryId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Gagal menghapus kategori");
      }

      await queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Kategori berhasil dihapus");
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error(
        "Gagal menghapus kategori: " +
          (error instanceof Error ? error.message : "Terjadi kesalahan")
      );
    } finally {
      setIsDeleting(false); // Reset deleting state
    }
  };

  if (isLoading)
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Skeleton className="h-4 w-12" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-24" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-24" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-24" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(pageSize)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-12" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between px-2">
          <Skeleton className="h-4 w-1/4" />
          <div className="flex items-center space-x-6 lg:space-x-8">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      </div>
    );

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Manajemen Kategori Barang</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Tambah Kategori Baru
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? "Edit Kategori" : "Tambah Kategori Baru"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="nama"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Kategori</FormLabel>
                      <FormControl>
                        <Input placeholder="Elektronik" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deskripsi</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Deskripsi kategori (opsional)"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Menyimpan..." : "Simpan"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Table className="border rounded-lg">
        <TableHeader>
          <TableRow>
            <TableHead>Nama Kategori</TableHead>
            <TableHead>Deskripsi</TableHead>
            <TableHead>Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories?.map((category) => (
            <TableRow key={category.id}>
              <TableCell>{category.nama}</TableCell>
              <TableCell>{category.description || "-"}</TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingCategory(category);
                          form.reset({
                            nama: category.nama,
                            description: category.description || "",
                          });
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Kategori</DialogTitle>
                      </DialogHeader>
                      <Form {...form}>
                        <form
                          onSubmit={form.handleSubmit(handleSubmit)}
                          className="space-y-4"
                        >
                          <FormField
                            control={form.control}
                            name="nama"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nama Kategori</FormLabel>
                                <FormControl>
                                  <Input placeholder="Elektronik" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Deskripsi</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Deskripsi kategori (opsional)"
                                    {...field}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <div className="flex justify-end space-x-2">
                            <Button type="submit" disabled={isSubmitting}>
                              {isSubmitting ? "Menyimpan..." : "Simpan"}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Konfirmasi Hapus Kategori
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Apakah Anda yakin ingin menghapus kategori ini? Barang
                          yang terkait mungkin akan kehilangan kategorinya.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(category.id)}
                          disabled={isDeleting} // Disable button while deleting
                        >
                          Hapus
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="flex-1 text-sm text-muted-foreground">
          {/* You can add selected row info here if needed */}
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setPage(1); // Reset to first page when page size changes
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 40, 50].map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Page {page} of {Math.ceil(totalCategories / pageSize)}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => setPage(1)}
              disabled={page <= 1}
            >
              <span className="sr-only">Go to first page</span>
              {/* First page icon */}
              &laquo;
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
            >
              <span className="sr-only">Go to previous page</span>
              {/* Previous page icon */}
              &lt;
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => setPage((prev) => prev + 1)}
              disabled={page * pageSize >= totalCategories}
            >
              <span className="sr-only">Go to next page</span>
              {/* Next page icon */}
              &gt;
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => setPage(Math.ceil(totalCategories / pageSize))}
              disabled={page * pageSize >= totalCategories}
            >
              <span className="sr-only">Go to last page</span>
              {/* Last page icon */}
              &raquo;
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
