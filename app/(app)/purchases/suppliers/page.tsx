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
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SuppliersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<{
    id: number;
    nama: string;
    alamat?: string | null;
    noTelp?: string | null;
    email?: string | null;
    namaKontak?: string | null;
    kota?: string | null;
    kodePos?: string | null;
    catatan?: string | null;
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
    queryKey: ["suppliers", currentPage, pageSize, searchQuery],
    queryFn: () =>
      getSuppliers({
        page: currentPage,
        limit: pageSize,
        search: searchQuery,
      }),
  });

  const suppliers = suppliersData?.data || [];
  const totalPages = suppliersData?.meta?.totalPages || 1;
  const totalCount = suppliersData?.meta?.totalCount || 0;

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };

  // Handle pagination
  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const handleFirstPage = () => {
    setCurrentPage(1);
  };

  const handleLastPage = () => {
    setCurrentPage(totalPages);
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
      <div className="flex mx-5 justify-between items-center">
        <h1 className="text-2xl font-bold">Manajemen Supplier</h1>
        <Button
          onClick={() => {
            setSelectedSupplier(null);
            setIsFormOpen(true);
          }}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Tambah Supplier Baru
        </Button>
      </div>

      {/* Search & Filter Area */}
      <div className="flex ml-5 items-center space-x-2 w-full max-w-sm">
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
      <div className="border m-5 rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">No.</TableHead>
              <TableHead>Nama Supplier</TableHead>
              <TableHead>Kontak Person</TableHead>
              <TableHead>No. Telepon</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Kota</TableHead>
              <TableHead>Kode Pos</TableHead>
              <TableHead>Alamat Lengkap</TableHead>
              <TableHead>Catatan Tambahan</TableHead>
              <TableHead className="w-24 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.map((supplier, index) => (
              <TableRow key={supplier.id}>
                <TableCell>
                  {(currentPage - 1) * pageSize + index + 1}
                </TableCell>
                <TableCell>{supplier.nama}</TableCell>
                <TableCell>{supplier.namaKontak}</TableCell>
                <TableCell>{supplier.noTelp}</TableCell>
                <TableCell>{supplier.email}</TableCell>
                <TableCell>{supplier.kota}</TableCell>
                <TableCell>{supplier.kodePos}</TableCell>
                <TableCell>{supplier.alamat}</TableCell>
                <TableCell>{supplier.catatan}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end space-x-2">
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
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex justify-end items-center space-x-2 me-5">
        {/* Rows per page control */}
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => {
              setPageSize(Number(value));
              setCurrentPage(1); // Reset to first page when page size changes
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
        {/* End Rows per page control */}
        <div className="flex items-center space-x-2">
          <span className="font-medium text-sm">
            Page {currentPage} dari {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={handleFirstPage}
            disabled={currentPage === 1 || isLoading}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={handlePreviousPage}
            disabled={currentPage === 1 || isLoading}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={handleNextPage}
            disabled={currentPage === totalPages || isLoading}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={handleLastPage}
            disabled={currentPage === totalPages || isLoading}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

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
        <AlertDialogContent className="max-w-md">
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
