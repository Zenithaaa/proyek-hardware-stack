"use client";

import { useState } from "react";
import { Download, Printer, Search, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range"; // Assuming this component exists
// import { PageHeader } from '@/components/shared/PageHeader'; // Assuming this component exists or will be created

// Placeholder for data types - replace with actual types from your schema
type Customer = { id: string; name: string };
type Category = { id: string; name: string };
type Item = { id: string; name: string };
type Transaction = {
  id: string;
  invoiceNumber: string;
  dateTime: string;
  customerName: string;
  cashierName: string;
  paymentMethod: string;
  subtotal: number;
  discount: number;
  tax: number;
  shippingCost: number;
  grandTotal: number;
  paymentStatus: string;
};

export default function SalesReportPage() {
  const [dateRange, setDateRange] = useState<any>(null); // Replace any with DateRange type from date picker
  const [selectedCustomer, setSelectedCustomer] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<string>("all");

  // Placeholder data - replace with actual data fetching logic
  const customers: Customer[] = [
    { id: "1", name: "Pelanggan A" },
    { id: "2", name: "Pelanggan B" },
  ];
  const categories: Category[] = [
    { id: "1", name: "Kategori X" },
    { id: "2", name: "Kategori Y" },
  ];
  const items: Item[] = [
    { id: "1", name: "Barang 123" },
    { id: "2", name: "Barang 456" },
  ];
  const transactions: Transaction[] = [
    {
      id: "txn1",
      invoiceNumber: "INV-001",
      dateTime: "2023-10-26 10:00",
      customerName: "Pelanggan A",
      cashierName: "Kasir 1",
      paymentMethod: "Tunai",
      subtotal: 100000,
      discount: 5000,
      tax: 10000,
      shippingCost: 0,
      grandTotal: 105000,
      paymentStatus: "Lunas",
    },
    // ... more transactions
  ];

  const handleExport = () => {
    console.log("Exporting report...");
    // Implement CSV/Excel export logic here
  };

  const handlePrint = () => {
    console.log("Printing report...");
    window.print(); // Basic print functionality
  };

  const handleApplyFilters = () => {
    console.log("Applying filters:", {
      dateRange,
      selectedCustomer,
      selectedCategory,
      selectedItem,
    });
    // Implement filter logic and refetch data here
  };

  const handleResetFilters = () => {
    setDateRange(null);
    setSelectedCustomer("all");
    setSelectedCategory("all");
    setSelectedItem("all");
    console.log("Filters reset");
    // Refetch data with default/no filters
  };

  // Placeholder KPI values - calculate based on filtered transactions
  const totalSales = transactions.reduce((sum, t) => sum + t.grandTotal, 0);
  const successfulTransactions = transactions.length;
  const averageTransactionValue =
    successfulTransactions > 0 ? totalSales / successfulTransactions : 0;
  const totalDiscount = transactions.reduce((sum, t) => sum + t.discount, 0);
  const totalTax = transactions.reduce((sum, t) => sum + t.tax, 0);
  const totalShipping = transactions.reduce(
    (sum, t) => sum + t.shippingCost,
    0
  );

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* I. Area Header & Aksi Utama */}
      <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
        {/* <PageHeader title="Laporan Penjualan" /> */}
        <h1 className="text-2xl font-bold">Laporan Penjualan</h1>
        <div className="flex space-x-2">
          <Button onClick={handleExport} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Laporan (CSV)
          </Button>
          <Button onClick={handlePrint} variant="outline">
            <Printer className="mr-2 h-4 w-4" />
            Cetak Laporan
          </Button>
        </div>
      </div>

      {/* II. Area Filter Laporan Penjualan */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Laporan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-1">
              <label htmlFor="date-range" className="text-sm font-medium">
                Rentang Tanggal
              </label>
              <DatePickerWithRange onChange={setDateRange} className="w-full" />
            </div>
            <div className="space-y-1">
              <label htmlFor="customer-filter" className="text-sm font-medium">
                Pelanggan
              </label>
              <Select
                value={selectedCustomer}
                onValueChange={setSelectedCustomer}
              >
                <SelectTrigger id="customer-filter">
                  <SelectValue placeholder="Semua Pelanggan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Pelanggan</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label htmlFor="category-filter" className="text-sm font-medium">
                Kategori Barang
              </label>
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger id="category-filter">
                  <SelectValue placeholder="Semua Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label htmlFor="item-filter" className="text-sm font-medium">
                Barang
              </label>
              <Select value={selectedItem} onValueChange={setSelectedItem}>
                <SelectTrigger id="item-filter">
                  <SelectValue placeholder="Semua Barang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Barang</SelectItem>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button onClick={handleApplyFilters}>
              <Search className="mr-2 h-4 w-4" />
              Tampilkan Laporan
            </Button>
            <Button onClick={handleResetFilters} variant="outline">
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* III. Area Ringkasan/KPI Penjualan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Penjualan (Omzet)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              Rp {totalSales.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Jumlah Transaksi Sukses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{successfulTransactions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Rata-rata Nilai per Transaksi</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              Rp {averageTransactionValue.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Diskon Diberikan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              Rp {totalDiscount.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Pajak Diterima</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">Rp {totalTax.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Biaya Kirim</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              Rp {totalShipping.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* IV. Tabel Detail Transaksi Penjualan */}
      <Card>
        <CardHeader>
          <CardTitle>Detail Transaksi Penjualan</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Struk</TableHead>
                <TableHead>Tanggal & Waktu</TableHead>
                <TableHead>Pelanggan</TableHead>
                <TableHead>Kasir</TableHead>
                <TableHead>Metode Pembayaran</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead className="text-right">Diskon</TableHead>
                <TableHead className="text-right">Pajak</TableHead>
                <TableHead className="text-right">Biaya Kirim</TableHead>
                <TableHead className="text-right">Grand Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length > 0 ? (
                transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>{tx.invoiceNumber}</TableCell>
                    <TableCell>{tx.dateTime}</TableCell>
                    <TableCell>{tx.customerName}</TableCell>
                    <TableCell>{tx.cashierName}</TableCell>
                    <TableCell>{tx.paymentMethod}</TableCell>
                    <TableCell className="text-right">
                      {tx.subtotal.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {tx.discount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {tx.tax.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {tx.shippingCost.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {tx.grandTotal.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {/* Replace with Badge component */}
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          tx.paymentStatus === "Lunas"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {tx.paymentStatus}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                        Lihat Detail
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={12} className="text-center">
                    Tidak ada data transaksi.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {/* Add pagination controls here if using @tanstack/react-table */}
        </CardContent>
      </Card>

      {/* V. Tabel Agregat Penjualan (Opsional) */}
      {/* Implement Tabel Penjualan per Barang and per Kategori here if needed */}

      {/* VI. Visualisasi Data (Opsional) */}
      {/* Implement Charts here if needed */}

      {/* VII. Komponen Pendukung: Indikator Loading, Indikator Keadaan Kosong. */}
      {/* Implement loading/empty states based on data fetching status */}
    </div>
  );
}
