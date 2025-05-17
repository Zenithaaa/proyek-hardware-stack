"use client";

import * as React from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Eye, FileText, Printer, ChevronDown } from "lucide-react";

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

interface Transaction {
  id: string;
  nomorStruk: string;
  tanggalWaktuTransaksi: Date;
  namaPelanggan: string;
  grandTotal: number;
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
  const [cashier, setCashier] = React.useState("all");
  const [paymentMethod, setPaymentMethod] = React.useState("all");

  // Dummy data untuk KPI
  const kpiData = {
    totalSales: 15000000,
    transactionCount: 25,
    averageTransaction: 600000,
  };

  // Dummy data untuk transaksi
  const transactions: Transaction[] = [
    {
      id: "1",
      nomorStruk: "INV/20240101/001",
      tanggalWaktuTransaksi: new Date(),
      namaPelanggan: "John Doe",
      grandTotal: 500000,
      statusPembayaran: "Lunas",
      statusTransaksi: "Selesai",
      metodePembayaran: "Tunai",
    },
    // Tambahkan data transaksi lainnya di sini
  ];

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
                Total Penjualan Hari Ini
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                }).format(kpiData.totalSales)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Jumlah Transaksi Hari Ini
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {kpiData.transactionCount}
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
                {new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                }).format(kpiData.averageTransaction)}
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
                <SelectItem value="completed">Selesai</SelectItem>
                <SelectItem value="cancelled">Dibatalkan</SelectItem>
                <SelectItem value="pending">Tertahan</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button>Terapkan Filter</Button>
          <Button variant="outline">Reset Filter</Button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No.</TableHead>
              <TableHead>Nomor Struk</TableHead>
              <TableHead>Tanggal & Waktu</TableHead>
              <TableHead>Pelanggan</TableHead>
              <TableHead className="text-right">Grand Total</TableHead>
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
                    transaction.tanggalWaktuTransaksi,
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
                  }).format(transaction.grandTotal)}
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
                  <Badge variant="secondary">
                    {transaction.statusTransaksi}
                  </Badge>
                </TableCell>
                <TableCell>{transaction.metodePembayaran}</TableCell>
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
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Menampilkan 1-10 dari 100 transaksi
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            Sebelumnya
          </Button>
          <Button variant="outline" size="sm">
            Berikutnya
          </Button>
        </div>
      </div>
    </div>
  );
}
