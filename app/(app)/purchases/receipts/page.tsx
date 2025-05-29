"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  ArchiveRestore,
  CalendarIcon,
  Download,
  Eye,
  Search,
  FilterX,
  PackageCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import { cn } from "@/lib/utils";

type Receipt = {
  id: string;
  nomorDokumenPenerimaan: string;
  tanggalPenerimaan: string;
  nomorSuratJalanSupplier: string;
  nomorPO: string | null;
  namaSupplier: string;
  status: string; // Mengubah tipe data status menjadi string
};

type ReceiptResponse = {
  success: boolean;
  data: Receipt[];
  meta: {
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
};

export default function ReceiptsPage() {
  const router = useRouter();

  // State untuk data dan loading
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<ReceiptResponse["meta"] | null>(null);

  // State untuk filter
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fungsi untuk memuat data penerimaan barang
  const fetchReceipts = async () => {
    setLoading(true);
    setError(null);

    try {
      // Buat URL dengan parameter filter
      let url = `/api/purchases/receipts?page=${currentPage}&pageSize=${pageSize}`;

      if (dateRange.from) {
        url += `&from=${dateRange.from.toISOString().split("T")[0]}`;
      }

      if (dateRange.to) {
        url += `&to=${dateRange.to.toISOString().split("T")[0]}`;
      }

      if (searchQuery) {
        url += `&searchQuery=${encodeURIComponent(searchQuery)}`;
      }

      const response = await fetch(url);
      const data: ReceiptResponse = await response.json();

      if (data.success) {
        setReceipts(data.data);
        setMeta(data.meta);
      } else {
        setError(data.error || "Failed to fetch receipts");
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat memuat data");
      console.error("Error fetching receipts:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fungsi untuk mengekspor data ke Excel
  const exportToExcel = () => {
    // Implementasi export ke Excel
    console.log("Export to Excel");
  };

  // Fungsi untuk mereset filter
  const resetFilters = () => {
    setDateRange({ from: undefined, to: undefined });
    setSearchQuery("");
    setCurrentPage(1);
  };

  // Fungsi untuk menangani perubahan halaman
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Fungsi untuk mengarahkan ke halaman detail penerimaan
  const viewReceiptDetail = (receiptId: string) => {
    router.push(`/purchases/receipts/new?receiptId=${receiptId}`);
  };

  // Fungsi untuk mengarahkan ke halaman form penerimaan baru
  const createNewReceipt = () => {
    router.push("/purchases/receipts/new");
  };

  // Efek untuk memuat data saat filter berubah
  useEffect(() => {
    fetchReceipts();
  }, [currentPage, pageSize, dateRange]);

  // Efek untuk memuat data saat pencarian berubah (dengan debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchReceipts();
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Render status badge dengan warna yang sesuai
  const renderStatusBadge = (status: string) => {
    // Mengubah tipe parameter menjadi string
    let variant:
      | "default"
      | "secondary"
      | "destructive"
      | "outline"
      | "success" = "outline"; // Menambahkan 'success' // Mengubah default menjadi outline

    let displayText = status; // Default display text is the status itself

    switch (status) {
      case "LENGKAP_SESUAI_PO": // From StatusPenerimaan enum
      case "Diterima Lengkap": // From PO status
        displayText = "Lengkap Sesuai PO";
        variant = "success"; // Menggunakan success untuk status lengkap
        break;
      case "SEBAGIAN_DITERIMA": // From StatusPenerimaan enum
      case "Diterima Sebagian": // From PO status
        displayText = "Sebagian Diterima";
        variant = "default"; // Menggunakan default untuk status sebagian atau dipesan
        break;
      case "TANPA_PO": // From StatusPenerimaan enum
        displayText = "Tanpa PO";
        variant = "outline";
        break;
      // Handle other PO statuses if they appear, map them to 'Tanpa PO' in receipt context
      case "Draft":
      case "Dipesan":
      case "Dibatalkan":
        displayText = "Tanpa PO";
        variant = "outline";
        break;
      default:
        variant = "outline"; // Fallback for any unexpected status
    }

    return <Badge variant={variant}>{displayText}</Badge>;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header & Aksi Utama */}
      <div className="flex justify-between mx-5 items-center">
        <h1 className="text-3xl font-bold">Daftar Penerimaan Barang</h1>
        <Button className="cursor-pointer" onClick={createNewReceipt}>
          <PackageCheck className="mr-2 h-4 w-4" />
          Catat Penerimaan Baru
        </Button>
      </div>

      {/* Area Filter & Pencarian */}
      <Card className="mx-5">
        <CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Filter Penerimaan Barang</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Filter Rentang Tanggal */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Rentang Tanggal Penerimaan
              </label>
              <DatePickerWithRange value={dateRange} onChange={setDateRange} />
            </div>

            {/* Input Pencarian */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Cari</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="No. Surat Jalan Supplier / No. PO Terkait / Nama Supplier"
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Tombol Aksi Filter */}
            <div className="flex items-end space-x-2">
              <Button
                variant="outline"
                className="flex items-center gap-1"
                onClick={resetFilters}
              >
                <FilterX className="h-4 w-4" />
                Reset Filter
              </Button>
              <Button
                variant="default"
                className="flex items-center gap-1"
                onClick={exportToExcel}
                disabled={receipts.length === 0}
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabel Data Penerimaan Barang */}
      <Card className="mx-5">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">No</TableHead>
                  <TableHead>No. Dokumen Penerimaan</TableHead>
                  <TableHead>Tanggal Penerimaan</TableHead>
                  <TableHead>No. Surat Jalan Supplier</TableHead>
                  <TableHead>No. PO Terkait</TableHead>
                  <TableHead>Nama Supplier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  // Skeleton loading
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={`skeleton-${index}`}>
                      <TableCell>
                        <Skeleton className="h-5 w-5" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-40" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-20" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-9 w-9 ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : error ? (
                  // Error message
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-4 text-red-500"
                    >
                      {error}
                    </TableCell>
                  </TableRow>
                ) : receipts.length === 0 ? (
                  // Empty state
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-4">
                      Tidak ada data penerimaan barang yang ditemukan
                    </TableCell>
                  </TableRow>
                ) : (
                  // Data rows
                  receipts.map((receipt, index) => (
                    <TableRow key={receipt.id}>
                      <TableCell>
                        {(currentPage - 1) * pageSize + index + 1}
                      </TableCell>
                      <TableCell>{receipt.nomorDokumenPenerimaan}</TableCell>
                      <TableCell>
                        {format(
                          new Date(receipt.tanggalPenerimaan),
                          "dd MMM yyyy",
                          {
                            locale: id,
                          }
                        )}
                      </TableCell>
                      <TableCell>{receipt.nomorSuratJalanSupplier}</TableCell>
                      <TableCell>{receipt.nomorPO || "-"}</TableCell>
                      <TableCell>{receipt.namaSupplier}</TableCell>
                      <TableCell>{renderStatusBadge(receipt.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => viewReceiptDetail(receipt.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {!loading && !error && meta && meta.totalPages > 0 && (
            <div className="p-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() =>
                        handlePageChange(Math.max(1, currentPage - 1))
                      }
                      disabled={currentPage === 1}
                    />
                  </PaginationItem>

                  {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          isActive={page === currentPage}
                          onClick={() => handlePageChange(page)}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  )}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        handlePageChange(
                          Math.min(meta.totalPages, currentPage + 1)
                        )
                      }
                      disabled={currentPage === meta.totalPages}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
