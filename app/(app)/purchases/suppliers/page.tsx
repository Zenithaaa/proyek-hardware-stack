"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PlusCircle, Pencil, Trash2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { SupplierFormDialog } from "@/components/supplier/supplier-form-dialog";

import {
  getSuppliers,
  deleteSupplierAction,
} from "@/lib/actions/supplier.actions";
import { toast } from "sonner";

export default function SuppliersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<{
    id: number;
    nama: string;
    alamat?: string | null;
    noTelp?: string | null;
    email?: string | null;
  } | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<{
    id: number;
    nama: string;
  } | null>(null);

  // Fetch suppliers data with pagination and search
  const {
    data: suppliersData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["suppliers", currentPage, searchQuery],
    queryFn: () =>
      getSuppliers({
        page: currentPage,
        limit: 10,
        search: searchQuery,
      }),
  });

  const suppliers = suppliersData?.data || [];
  const totalPages = suppliersData?.meta?.totalPages || 1;

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle edit supplier
  const handleEditSupplier = (supplier: typeof selectedSupplier) => {
    setSelectedSupplier(supplier);
    setIsFormOpen(true);
  };

  // Handle delete supplier
  const handleDeleteClick = (supplier: { id: number; nama: string }) => {
    setSupplierToDelete(supplier);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!supplierToDelete) return;

    try {
      const response = await deleteSupplierAction(supplierToDelete.id);

      if (response.success) {
        toast.success(response.message || "Supplier berhasil dihapus");
        refetch();
      } else {
        toast.error(response.message || "Gagal menghapus supplier");
      }
    } catch (error) {
      console.error("Error deleting supplier:", error);
      toast.error("Terjadi kesalahan saat menghapus supplier");
    } finally {
      setIsDeleteDialogOpen(false);
      setSupplierToDelete(null);
    }
  };

  // Handle form dialog close
  const handleFormDialogClose = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      setSelectedSupplier(null);
    }
  };

  // Render loading skeleton
  if (isLoading) {
    return (
      <div className="container py-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Manajemen Supplier</h1>
          <Skeleton className="h-10 w-40" />
        </div>

        <div className="w-full max-w-sm">
          <Skeleton className="h-10 w-full" />
        </div>

        <div className="border rounded-md">
          <div className="p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center space-x-4 py-4 border-b last:border-0"
              >
                <Skeleton className="h-6 w-6" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Header & Main Actions */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Manajemen Supplier</h1>
        <Button onClick={() => setIsFormOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Tambah Supplier Baru
        </Button>
      </div>

      {/* Search & Filter Area */}
      <div className="flex items-center space-x-2 w-full max-w-sm">
        <Input
          placeholder="Cari Supplier..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="w-full"
        />
        <Button variant="outline" size="icon">
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {/* Suppliers Table */}
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">No.</TableHead>
              <TableHead>Nama Supplier</TableHead>
              <TableHead>Kontak Person</TableHead>
              <TableHead>No. Telepon</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Kota</TableHead>
              <TableHead className="w-24 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6">
                  Tidak ada data supplier ditemukan
                </TableCell>
              </TableRow>
            ) : (
              suppliers.map((supplier, index) => (
                <TableRow key={supplier.id}>
                  <TableCell>{(currentPage - 1) * 10 + index + 1}</TableCell>
                  <TableCell className="font-medium">{supplier.nama}</TableCell>
                  <TableCell>{supplier.namaKontak || "-"}</TableCell>
                  <TableCell>{supplier.noTelp || "-"}</TableCell>
                  <TableCell>{supplier.email || "-"}</TableCell>
                  <TableCell>{supplier.kota || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEditSupplier(supplier)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          handleDeleteClick({
                            id: supplier.id,
                            nama: supplier.nama,
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Sebelumnya
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              size="sm"
              onClick={() => handlePageChange(page)}
            >
              {page}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Selanjutnya
          </Button>
        </div>
      )}

      {/* Add/Edit Supplier Dialog */}
      <SupplierFormDialog
        open={isFormOpen}
        onOpenChange={handleFormDialogClose}
        supplier={selectedSupplier || undefined}
        onSuccess={refetch}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus Supplier</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus supplier{" "}
              <span className="font-semibold">{supplierToDelete?.nama}</span>?
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
