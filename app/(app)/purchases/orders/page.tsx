"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  FilePlus2,
  Pencil,
  Truck,
  XCircle,
} from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
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

import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import Link from "next/link";

// Helper function untuk mendapatkan warna badge berdasarkan status
const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case "Draft":
      return "secondary";
    case "Dipesan":
      return "default";
    case "Sebagian Diterima":
      return "success";
    case "Selesai Diterima":
      return "success";
    case "Dibatalkan":
      return "destructive";
    default:
      return "outline";
  }
};

export default function PurchaseOrdersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // Add pageSize state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [poToDelete, setPoToDelete] = useState<{
    id: number;
    nomorPO: string;
  } | null>(null);
  const [dateRange, setDateRange] = useState<
    { from?: Date; to?: Date } | undefined
  >(undefined);
  
  const {
    data: purchaseOrdersData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [
      "purchaseOrders",
      currentPage,
      pageSize, // Add pageSize to queryKey
      searchQuery,
      statusFilter,
      dateRange,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", currentPage.toString());
      params.append("limit", pageSize.toString()); // Use pageSize
      if (searchQuery) {
        params.append("search", searchQuery);
      }
      if (statusFilter !== "Semua") {
        params.append("status", statusFilter);
      }
      if (dateRange?.from) {
        params.append("startDate", format(dateRange.from, "yyyy-MM-dd"));
      }
      if (dateRange?.to) {
        params.append("endDate", format(dateRange.to, "yyyy-MM-dd"));
      }

      const res = await fetch(
        `/api/purchases/orders/list?${params.toString()}`
      );
      if (!res.ok) {
        throw new Error("Failed to fetch purchase orders");
      }
      return res.json();
    },
  });

  const purchaseOrders = purchaseOrdersData?.data || [];
  const totalPages = purchaseOrdersData?.meta?.totalPages || 1;
  const totalCount = purchaseOrdersData?.meta?.totalCount || 0;

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };

  // Handle status filter change
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle delete PO
  const handleDeleteClick = (po: { id: number; nomorPO: string }) => {
    setPoToDelete(po);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!poToDelete) return;

    try {
      // Implementasi API call untuk menghapus PO akan ditambahkan nanti
      console.log(`Deleting PO: ${poToDelete.nomorPO}`);

      const res = await fetch(`/api/purchases/orders/${poToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to delete purchase order");
      }

      // Refresh data setelah menghapus
      refetch();
    } catch (error) {
      console.error("Error deleting purchase order:", error);
    } finally {
      setIsDeleteDialogOpen(false);
      setPoToDelete(null);
    }
  };

  // Reset filter
  const handleResetFilter = () => {
    setSearchQuery("");
    setStatusFilter("Semua");
    setDateRange(undefined);
    setCurrentPage(1);
  };

  // Render loading skeleton
  if (isLoading) {
    return (
      <div className="container mx-5 py-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Daftar Pesanan Pembelian (PO)</h1>
          <Skeleton className="h-10 w-40" />
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
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
        <h1 className="text-2xl font-bold">Daftar Pesanan Pembelian (PO)</h1>
        <Button asChild>
          <Link href="/purchases/orders/new">
            <FilePlus2 className="mr-2 h-4 w-4" />
            Buat PO Baru
          </Link>
        </Button>
      </div>

      {/* Filter & Search Area */}
      <div className="grid gap-4 mx-5 md:grid-cols-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Rentang Tanggal PO</label>
          <DatePickerWithRange
            className="w-full"
            value={dateRange}
            onChange={setDateRange}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Cari No. PO / Nama Supplier
          </label>
          <Input
            placeholder="Cari No. PO / Nama Supplier"
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Status PO</label>
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Semua">Semua</SelectItem>
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Dipesan">Dipesan</SelectItem>
              <SelectItem value="Sebagian Diterima">
                Sebagian Diterima
              </SelectItem>
              <SelectItem value="Selesai Diterima">Selesai Diterima</SelectItem>
              <SelectItem value="Dibatalkan">Dibatalkan</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end space-x-2">
          <Button variant="default" className="flex-1">
            Terapkan Filter
          </Button>
          <Button variant="outline" onClick={handleResetFilter}>
            Reset
          </Button>
        </div>
      </div>

      {/* Purchase Orders Table */}
      <div className="border rounded-md mx-5">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No. PO</TableHead>
              <TableHead>Tanggal PO</TableHead>
              <TableHead>Nama Supplier</TableHead>
              <TableHead>Estimasi Total PO (Rp)</TableHead>
              <TableHead>Status PO</TableHead>
              <TableHead>Tanggal Jatuh Tempo</TableHead>
              {/* 
              <TableHead className="text-right">Aksi</TableHead>
              */}
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchaseOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6">
                  Tidak ada data pesanan pembelian ditemukan
                </TableCell>
              </TableRow>
            ) : (
              purchaseOrders.map((po) => (
                <TableRow key={po.id}>
                  <TableCell>{po.nomorPO}</TableCell>
                  <TableCell>
                    {format(po.tanggalPesan, "dd MMM yyyy", { locale: id })}
                  </TableCell>
                  <TableCell>{po.namaSupplier}</TableCell>
                  <TableCell>
                    {new Intl.NumberFormat("id-ID").format(po.total)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(po.status)}>
                      {po.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {po.tanggalJatuhTempo
                      ? format(po.tanggalJatuhTempo, "dd MMM yyyy", {
                          locale: id,
                        })
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {/*  
                      <Button
                        variant="outline"
                        size="icon"
                        asChild
                        title="Lihat Detail/Cetak PO"
                      >
                        <Link href={`/purchases/orders/${po.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      */}

                      {po.status === "Draft" && (
                        <Button
                          variant="outline"
                          size="icon"
                          asChild
                          title="Edit PO"
                        >
                          <Link href={`/purchases/orders/${po.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}

                      {["Draft", "Dipesan"].includes(po.status) && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDeleteClick(po)}
                          title="Batalkan PO"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}

                      {["Dipesan", "Sebagian Diterima"].includes(po.status) && (
                        <Button
                          variant="outline"
                          size="icon"
                          asChild
                          title="Buat Penerimaan Barang"
                        >
                          <Link href={`/purchases/receipts/new?poId=${po.id}`}>
                            <Truck className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex justify-end items-center space-x-2 pt-4 me-5">
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Pembatalan PO</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin membatalkan PO{" "}
              <span className="font-semibold">{poToDelete?.nomorPO}</span>?
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Ya, Batalkan PO
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const handleFirstPage = () => {
  setCurrentPage(1);
};

const handlePreviousPage = () => {
  setCurrentPage((prev) => Math.max(prev - 1, 1));
};

const handleNextPage = () => {
  setCurrentPage((prev) => Math.min(prev + 1, totalPages));
};

const handleLastPage = () => {
  setCurrentPage(totalPages);
};
