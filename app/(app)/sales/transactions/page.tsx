"use client";

import * as React from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Eye, FileText, Printer, ChevronDown, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import { toast } from "sonner";

interface Transaction {
  id: string;
  nomorStruk: string;
  tanggalWaktuTransaksi: string;
  namaPelanggan: string;
  pendapatan: number;
  statusPembayaran: string;
  statusTransaksi: string;
  metodePembayaran: string;
}

export default function TransactionsPage() {
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(),
  });

  // State untuk filter
  const [searchQuery, setSearchQuery] = React.useState("");
  const [paymentStatus, setPaymentStatus] = React.useState("all");
  const [transactionStatus, setTransactionStatus] = React.useState("all");
  const [paymentMethod, setPaymentMethod] = React.useState("all");

  // State untuk data transaksi
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // State untuk KPI
  const [kpiData, setKpiData] = React.useState({
    totalSales: 0,
    transactionCount: 0,
    averageTransaction: 0,
  });

  // Fungsi untuk mengambil data transaksi dari API
  const fetchTransactions = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Membuat parameter query untuk filter tanggal
      const params = new URLSearchParams();
      if (date?.from) {
        params.append("from", date.from.toISOString());
      }
      if (date?.to) {
        params.append("to", date.to.toISOString());
      }

      const response = await fetch(
        `/api/payments/midtrans/transactions?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Gagal mengambil data transaksi");
      }

      // Filter data berdasarkan input pengguna
      let filteredData = data.data;

      // Filter berdasarkan pencarian
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredData = filteredData.filter(
          (transaction: Transaction) =>
            transaction.nomorStruk.toLowerCase().includes(query) ||
            transaction.namaPelanggan.toLowerCase().includes(query)
        );
      }

      // Filter berdasarkan status pembayaran
      if (paymentStatus !== "all") {
        filteredData = filteredData.filter((transaction: Transaction) => {
          if (paymentStatus === "paid")
            return transaction.statusPembayaran === "Lunas";
          if (paymentStatus === "pending")
            return transaction.statusPembayaran === "Tidak Lunas";
          return true;
        });
      }

      // Filter berdasarkan status transaksi
      if (transactionStatus !== "all") {
        filteredData = filteredData.filter((transaction: Transaction) => {
          if (transactionStatus === "completed")
            return transaction.statusTransaksi === "Lunas";
          if (transactionStatus === "pending")
            return transaction.statusTransaksi === "Ditahan";
          if (transactionStatus === "cancelled")
            return transaction.statusTransaksi === "Gagal/Cancel";
          return true;
        });
      }

      // Filter berdasarkan metode pembayaran
      if (paymentMethod !== "all") {
        filteredData = filteredData.filter(
          (transaction: Transaction) =>
            transaction.metodePembayaran === paymentMethod
        );
      }

      // Hitung KPI
      const totalSales = filteredData.reduce(
        (sum: number, transaction: Transaction) => sum + transaction.pendapatan,
        0
      );
      const transactionCount = filteredData.length;
      const averageTransaction =
        transactionCount > 0 ? totalSales / transactionCount : 0;

      setTransactions(filteredData);
      setKpiData({
        totalSales,
        transactionCount,
        averageTransaction,
      });
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat mengambil data");
      toast.error(err.message || "Terjadi kesalahan saat mengambil data");
    } finally {
      setLoading(false);
    }
  }, [date, searchQuery, paymentStatus, transactionStatus, paymentMethod]);

  // Panggil API saat komponen dimuat atau filter berubah
  React.useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Fungsi untuk menerapkan filter
  const applyFilters = () => {
    fetchTransactions();
  };

  // Fungsi untuk mereset filter
  const resetFilters = () => {
    setDate({
      from: new Date(),
      to: new Date(),
    });
    setSearchQuery("");
    setPaymentStatus("all");
    setTransactionStatus("all");
    setPaymentMethod("all");
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header & KPI Cards */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">
          Daftar Transaksi Penjualan
        </h1>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Pendapatan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary inline mr-2" />
                ) : (
                  new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                  }).format(kpiData.totalSales)
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Jumlah Transaksi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary inline mr-2" />
                ) : (
                  kpiData.transactionCount
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Rata-rata per Transaksi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary inline mr-2" />
                ) : (
                  new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                  }).format(kpiData.averageTransaction)
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filter Section */}
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Rentang Tanggal</label>
            <DatePickerWithRange date={date} setDate={setDate} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Pencarian</label>
            <Input
              placeholder="Cari No. Struk / Nama Pelanggan"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Status Pembayaran</label>
            <Select value={paymentStatus} onValueChange={setPaymentStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="paid">Lunas</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Gagal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Status Transaksi</label>
            <Select
              value={transactionStatus}
              onValueChange={setTransactionStatus}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="completed">Lunas</SelectItem>
                <SelectItem value="cancelled">Gagal/Cancel</SelectItem>
                <SelectItem value="pending">Ditahan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Metode Pembayaran</label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih metode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Metode</SelectItem>
                <SelectItem value="credit_card">Kartu Kredit</SelectItem>
                <SelectItem value="gopay">GoPay</SelectItem>
                <SelectItem value="shopeepay">ShopeePay</SelectItem>
                <SelectItem value="dana">DANA</SelectItem>
                <SelectItem value="qris">QRIS</SelectItem>
                <SelectItem value="bank_transfer">Transfer Bank</SelectItem>
                <SelectItem value="echannel">E-Channel</SelectItem>
                <SelectItem value="alfamart">Alfamart</SelectItem>
                <SelectItem value="indomaret">Indomaret</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={applyFilters}>Terapkan Filter</Button>
          <Button variant="outline" onClick={resetFilters}>
            Reset Filter
          </Button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-md border">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Memuat data transaksi...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center p-8 text-destructive">
            <span>Error: {error}</span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex items-center justify-center p-8 text-muted-foreground">
            <span>Tidak ada data transaksi yang ditemukan</span>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No.</TableHead>
                <TableHead>Nomor Struk</TableHead>
                <TableHead>Tanggal & Waktu</TableHead>
                <TableHead>Pelanggan</TableHead>
                <TableHead className="text-right">Pendapatan</TableHead>
                <TableHead>Status Pembayaran</TableHead>
                <TableHead>Status Transaksi</TableHead>
                <TableHead>Metode Bayar</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction, index) => (
                <TableRow key={transaction.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{transaction.nomorStruk}</TableCell>
                  <TableCell>
                    {format(
                      new Date(transaction.tanggalWaktuTransaksi),
                      "dd MMM yyyy HH:mm",
                      {
                        locale: id,
                      }
                    )}
                  </TableCell>
                  <TableCell>{transaction.namaPelanggan}</TableCell>
                  <TableCell className="text-right">
                    {new Intl.NumberFormat("id-ID", {
                      style: "currency",
                      currency: "IDR",
                    }).format(transaction.pendapatan)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        transaction.statusPembayaran === "Lunas"
                          ? "success"
                          : "destructive"
                      }
                    >
                      {transaction.statusPembayaran}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        transaction.statusTransaksi === "Lunas"
                          ? "success"
                          : transaction.statusTransaksi === "Ditahan"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {transaction.statusTransaksi}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {transaction.metodePembayaran.charAt(0).toUpperCase() +
                      transaction.metodePembayaran.slice(1)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" title="Lihat Detail">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Cetak Struk">
                        <Printer className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {transactions.length > 0
            ? `Menampilkan ${transactions.length} transaksi`
            : "Tidak ada transaksi"}
        </div>
        {/* Pagination bisa diimplementasikan di masa depan jika diperlukan */}
      </div>
    </div>
  );
}
