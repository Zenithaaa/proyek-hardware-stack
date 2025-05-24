"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  CalendarIcon,
  Download,
  Printer,
  Eye,
  Search,
  FilterX,
  X,
} from "lucide-react";
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
} from "@tabler/icons-react";
import { useForm } from "react-hook-form";
import * as XLSX from "xlsx";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { Label } from "@/components/ui/label";

type Transaction = {
  id: string;
  nomorStruk: string;
  tanggalWaktuTransaksi: string;
  namaPelanggan: string;
  pendapatan: number;
  statusPembayaran: string;
  statusTransaksi: string;
  metodePembayaran: string;
};

type TransactionResponse = {
  success: boolean;
  data: Transaction[];
  meta: {
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
    totalRevenue: number;
    transactionCount: number;
    averagePerTransaction: number;
    revenueChangePercent?: number;
    transactionCountChangePercent?: number;
    averagePerTransactionChangePercent?: number;
  };
};

export default function TransactionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State untuk data dan loading
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<TransactionResponse["meta"] | null>(null);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // State untuk filter
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [transactionStatus, setTransactionStatus] = useState("all");
  const [paymentMethod, setPaymentMethod] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fungsi untuk memformat angka sebagai mata uang
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Fungsi untuk memuat data transaksi
  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);

    try {
      // Buat URL dengan parameter filter
      let url = `/api/sales/transactions?page=${currentPage}&pageSize=${pageSize}`;

      if (fromDate) {
        url += `&from=${fromDate.toISOString().split("T")[0]}`;
      }

      if (toDate) {
        url += `&to=${toDate.toISOString().split("T")[0]}`;
      }

      if (searchQuery) {
        url += `&searchQuery=${encodeURIComponent(searchQuery)}`;
      }

      if (paymentStatus !== "all") {
        url += `&paymentStatus=${paymentStatus}`;
      }

      if (transactionStatus !== "all") {
        url += `&transactionStatus=${transactionStatus}`;
      }

      if (paymentMethod !== "all") {
        url += `&paymentMethod=${paymentMethod}`;
      }

      const response = await fetch(url);
      const data: TransactionResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Gagal memuat data transaksi");
      }

      setTransactions(data.data);
      setMeta(data.meta);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat memuat data");
      console.error("Error fetching transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fungsi untuk mengekspor data ke Excel
  const exportToExcel = () => {
    if (!transactions.length) return;

    const worksheet = XLSX.utils.json_to_sheet(
      transactions.map((tx) => ({
        "Nomor Struk": tx.nomorStruk,
        "Tanggal & Waktu": format(
          new Date(tx.tanggalWaktuTransaksi),
          "dd MMM yyyy HH:mm",
          { locale: id }
        ),
        Pelanggan: tx.namaPelanggan,
        Total: formatCurrency(tx.pendapatan),
        "Status Pembayaran": tx.statusPembayaran,
        "Status Transaksi": tx.statusTransaksi,
        "Metode Pembayaran": tx.metodePembayaran,
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transaksi");

    // Buat nama file dengan tanggal
    const fileName = `Transaksi_${format(new Date(), "yyyyMMdd")}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // Fungsi untuk mereset filter
  const resetFilters = () => {
    setFromDate(undefined);
    setToDate(undefined);
    setSearchQuery("");
    setPaymentStatus("all");
    setTransactionStatus("all");
    setPaymentMethod("all");
    setCurrentPage(1);
  };

  // Fungsi untuk menangani perubahan halaman
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Fungsi untuk memperbarui status transaksi
  const handleUpdateStatus = async (id: string, status: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/sales/transactions`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: id, statusTransaksi: status }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Gagal memperbarui status transaksi");
      }

      // Muat ulang data setelah berhasil update
      fetchTransactions();
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat memperbarui status");
      console.error("Error updating transaction status:", err);
      setLoading(false); // Hentikan loading jika terjadi error
    }
  };

  // Efek untuk memuat data saat filter berubah
  useEffect(() => {
    fetchTransactions();
  }, [
    currentPage,
    pageSize,
    fromDate,
    toDate,
    paymentStatus,
    transactionStatus,
    paymentMethod,
  ]);

  // Efek untuk memuat data saat pencarian berubah (dengan debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTransactions();
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Render status badge dengan warna yang sesuai
  const renderStatusBadge = (
    status: string,
    type: "payment" | "transaction"
  ) => {
    let variant:
      | "default"
      | "secondary"
      | "destructive"
      | "outline"
      | "success" = "default";

    let displayText = status; // Default display text is the status itself

    if (type === "payment") {
      if (status === "SUCCESS") {
        variant = "success";
        displayText = "Lunas"; // Display "SUCCESS" for paid status
      } else {
        variant = "destructive";
        displayText = "Tidak Lunas"; // Display "Tidak Lunas" for any status other than SUCCESS
      }
    } else if (type === "transaction") {
      if (status === "SELESAI") {
        variant = "default"; // Change variant to default for black/dark color
        displayText = "Selesai"; // Display "SELESAI" for completed transaction status
      } else if (status === "Tertahan") {
        variant = "secondary";
        displayText = "Tertahan";
      } else {
        variant = "destructive";
        displayText = status; // Display original status for other transaction statuses
      }
    }

    // Add a class for slightly larger font size and bold font for both success payment and completed transaction badges
    const className =
      (type === "payment" && status === "SUCCESS") ||
      (type === "transaction" && status === "SELESAI")
        ? "text-sm font-semibold"
        : "";

    return (
      <Badge variant={variant} className={className}>
        {displayText}
      </Badge>
    );
  };

  // Fungsi untuk mencetak transaksi sebagai PDF
  const printTransactionPDF = (transaction: Transaction) => {
    // Buat elemen HTML untuk dicetak
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Struk Transaksi - ${transaction.nomorStruk}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { font-size: 18px; text-align: center; }
            .info-row { display: flex; margin-bottom: 8px; }
            .info-label { width: 150px; font-weight: bold; }
            .info-value { flex: 1; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <h1>Detail Transaksi - ${transaction.nomorStruk}</h1>
          
          <div class="info-row">
            <div class="info-label">Nomor Struk:</div>
            <div class="info-value">${transaction.nomorStruk}</div>
          </div>
          
          <div class="info-row">
            <div class="info-label">Tanggal & Waktu:</div>
            <div class="info-value">${format(
              new Date(transaction.tanggalWaktuTransaksi),
              "dd MMM yyyy HH:mm",
              { locale: id }
            )}</div>
          </div>
          
          <div class="info-row">
            <div class="info-label">Pelanggan:</div>
            <div class="info-value">${transaction.namaPelanggan}</div>
          </div>
          
          <div class="info-row">
            <div class="info-label">Total:</div>
            <div class="info-value">${formatCurrency(
              transaction.pendapatan
            )}</div>
          </div>
          
          <div class="info-row">
            <div class="info-label">Status Pembayaran:</div>
            <div class="info-value">${transaction.statusPembayaran}</div>
          </div>
          
          <div class="info-row">
            <div class="info-label">Status Transaksi:</div>
            <div class="info-value">${transaction.statusTransaksi}</div>
          </div>
          
          <div class="info-row">
            <div class="info-label">Metode Pembayaran:</div>
            <div class="info-value">${transaction.metodePembayaran}</div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header & Ringkasan */}
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold ms-5">Daftar Transaksi Penjualan</h1>

        {/* Kartu Ringkasan KPI */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 m-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Penjualan
              </CardTitle>
              {meta?.revenueChangePercent !== undefined && (
                <Badge
                  variant={
                    meta.revenueChangePercent >= 0 ? "default" : "destructive"
                  }
                >
                  {meta.revenueChangePercent >= 0 ? "↑" : "↓"}{" "}
                  {meta.revenueChangePercent.toFixed(1)}%
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-7 w-32" />
              ) : (
                <p className="text-2xl font-bold">
                  {formatCurrency(meta?.totalRevenue || 0)}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Jumlah Transaksi
              </CardTitle>
              {meta?.transactionCountChangePercent !== undefined && (
                <Badge
                  variant={
                    meta.transactionCountChangePercent >= 0
                      ? "default"
                      : "destructive"
                  }
                >
                  {meta.transactionCountChangePercent >= 0 ? "↑" : "↓"}{" "}
                  {meta.transactionCountChangePercent.toFixed(1)}%
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-7 w-20" />
              ) : (
                <p className="text-2xl font-bold">
                  {meta?.transactionCount || 0}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Rata-Rata per Transaksi
              </CardTitle>
              {meta?.averagePerTransactionChangePercent !== undefined && (
                <Badge
                  variant={
                    meta.averagePerTransactionChangePercent >= 0
                      ? "default"
                      : "destructive"
                  }
                >
                  {meta.averagePerTransactionChangePercent >= 0 ? "↑" : "↓"}{" "}
                  {meta.averagePerTransactionChangePercent.toFixed(1)}%
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-7 w-32" />
              ) : (
                <p className="text-2xl font-bold">
                  {formatCurrency(meta?.averagePerTransaction || 0)}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Chart Area Interactive */}
      <div className="m-5">
        <ChartAreaInteractive />
      </div>

      {/* Area Filter & Pencarian */}
      <div className="bg-card rounded-lg border p-4 space-y-4 m-5">
        <h2 className="text-lg font-semibold">Filter Transaksi</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Filter Rentang Tanggal */}
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium">Dari Tanggal</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !fromDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {fromDate ? (
                    format(fromDate, "dd MMMM yyyy", { locale: id })
                  ) : (
                    <span>Pilih tanggal</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={fromDate}
                  onSelect={setFromDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium">Sampai Tanggal</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !toDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {toDate ? (
                    format(toDate, "dd MMMM yyyy", { locale: id })
                  ) : (
                    <span>Pilih tanggal</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={toDate}
                  onSelect={setToDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Input Pencarian */}
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium">Cari</label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="No. Struk / Nama Pelanggan / ID PG"
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Filter Status Pembayaran - Hidden */}
          <div className="hidden">
            <label className="text-sm font-medium">Status Pembayaran</label>
            <Select value={paymentStatus} onValueChange={setPaymentStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="paid">Lunas</SelectItem>
                <SelectItem value="pending">Belum Lunas</SelectItem>
                <SelectItem value="failed">Gagal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filter Status Transaksi - Hidden */}
          <div className="hidden">
            <label className="text-sm font-medium">Status Transaksi</label>
            <Select
              value={transactionStatus}
              onValueChange={setTransactionStatus}
            >
              <SelectTrigger>
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="completed">Selesai</SelectItem>
                <SelectItem value="pending">Tertahan</SelectItem>
                <SelectItem value="cancelled">Dibatalkan</SelectItem>
              </SelectContent>
            </Select>
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
              disabled={transactions.length === 0}
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Tabel Data Transaksi */}
      <div className="bg-card rounded-lg border overflow-hidden m-5">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">No</TableHead>
                <TableHead>Nomor Struk</TableHead>
                <TableHead>Tanggal & Waktu</TableHead>
                <TableHead>Pelanggan</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status Pembayaran</TableHead>
                <TableHead>Status Transaksi</TableHead>
                <TableHead>Metode Pembayaran</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                // Skeleton loading
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    {Array.from({ length: 9 }).map((_, cellIndex) => (
                      <TableCell key={`cell-${index}-${cellIndex}`}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : error ? (
                // Error state
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center py-10 text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <p>{error}</p>
                      <Button variant="outline" onClick={fetchTransactions}>
                        Coba Lagi
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : transactions.length === 0 ? (
                // Empty state
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center py-10 text-muted-foreground"
                  >
                    Tidak ada transaksi ditemukan.
                  </TableCell>
                </TableRow>
              ) : (
                // Data rows
                transactions.map((transaction, index) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {(meta?.page - 1) * meta?.pageSize + index + 1}
                    </TableCell>
                    <TableCell>{transaction.nomorStruk}</TableCell>
                    <TableCell>
                      {format(
                        new Date(transaction.tanggalWaktuTransaksi),
                        "dd MMM yyyy HH:mm",
                        { locale: id }
                      )}
                    </TableCell>
                    <TableCell>{transaction.namaPelanggan}</TableCell>
                    <TableCell>
                      {formatCurrency(transaction.pendapatan)}
                    </TableCell>
                    <TableCell>
                      {renderStatusBadge(
                        transaction.statusPembayaran,
                        "payment"
                      )}
                    </TableCell>
                    <TableCell>
                      {renderStatusBadge(
                        transaction.statusTransaksi,
                        "transaction"
                      )}
                    </TableCell>
                    <TableCell>{transaction.metodePembayaran}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedTransaction(transaction);
                            setIsPreviewOpen(true);
                          }}
                          title="Lihat Detail"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {/* Tombol untuk mengubah status transaksi menjadi Selesai */}
                        {transaction.statusTransaksi === "Tertahan" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleUpdateStatus(transaction.id, "SELESAI")
                            }
                            title="Ubah Status Menjadi Selesai"
                          >
                            {/* Ganti ikon sesuai kebutuhan, contoh: CheckCircle */}
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              class="lucide lucide-check-circle"
                            >
                              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                              <path d="m9 11 3 3L22 4" />
                            </svg>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => printTransactionPDF(transaction)}
                          title="Cetak Struk"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Kontrol Paginasi */}
        {!loading && !error && meta && meta.totalPages > 0 && (
          <div className="flex items-center justify-between px-4 py-4 border-t">
            <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
              {meta
                ? `${
                    meta.page > 0 ? (meta.page - 1) * pageSize + 1 : 0
                  } - ${Math.min(meta.page * pageSize, meta.totalCount)} dari ${
                    meta.totalCount
                  } transaksi`
                : "0 of 0 row(s) selected."}
            </div>
            <div className="flex w-full items-center gap-8 lg:w-fit">
              <div className="flex items-center gap-2">
                <Label htmlFor="rows-per-page" className="text-sm font-medium">
                  Rows per page
                </Label>
                <Select
                  value={`${pageSize}`}
                  onValueChange={(value) => {
                    setPageSize(Number(value));
                    setCurrentPage(1); // Reset ke halaman pertama saat mengubah ukuran halaman
                  }}
                >
                  <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                    <SelectValue placeholder={pageSize} />
                  </SelectTrigger>
                  <SelectContent side="top">
                    {[10, 20, 30, 40, 50].map((size) => (
                      <SelectItem key={size} value={`${size}`}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex w-fit items-center justify-center text-sm font-medium">
                Page {meta.page} of {meta.totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePageChange(1)}
                  disabled={meta.page <= 1}
                >
                  <IconChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePageChange(meta.page - 1)}
                  disabled={meta.page <= 1}
                >
                  <IconChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePageChange(meta.page + 1)}
                  disabled={meta.page >= meta.totalPages}
                >
                  <IconChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePageChange(meta.totalPages)}
                  disabled={meta.page >= meta.totalPages}
                >
                  <IconChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dialog Preview Transaksi */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detail Transaksi</DialogTitle>
            <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </DialogHeader>
          {selectedTransaction && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="font-medium">Nomor Struk:</div>
                <div className="col-span-3">
                  {selectedTransaction.nomorStruk}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="font-medium">Pelanggan:</div>
                <div className="col-span-3">
                  {selectedTransaction.namaPelanggan}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="font-medium">Total:</div>
                <div className="col-span-3">
                  {formatCurrency(selectedTransaction.pendapatan)}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="font-medium">Status Pembayaran:</div>
                <div className="col-span-3">
                  {renderStatusBadge(
                    selectedTransaction.statusPembayaran,
                    "payment"
                  )}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="font-medium">Status Transaksi:</div>
                <div className="col-span-3">
                  {renderStatusBadge(
                    selectedTransaction.statusTransaksi,
                    "transaction"
                  )}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="font-medium">Metode Pembayaran:</div>
                <div className="col-span-3">
                  {selectedTransaction.metodePembayaran}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
