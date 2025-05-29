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
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

// Placeholder for data types - replace with actual types from your schema
type Customer = { id: string; nama: string }; // Adjusted to match Pelanggan model
type Category = { id: string; nama: string }; // Adjusted to match Kategori model
type Kategori = { id: string; nama: string };

type Item = { id: string; nama: string; kategori: Kategori }; // Adjusted to match Item model

type DetailTransaksiPenjualan = {
  id: string;
  itemId: number;
  namaItemSaatTransaksi: string;
  jumlah: number;
  hargaJualSaatTransaksi: number;
  hargaBeliSaatTransaksi?: number;
  diskonItemPersen?: number;
  diskonItemNominal?: number;
  subtotal: number;
  item: Item; // Added relation
  kategori: Kategori; // Added relation
};

type PembayaranTransaksi = {
  id: string;
  metodePembayaran: string;
  jumlahDibayar: number;
  // Add other fields from PembayaranTransaksi if needed
};

type TransaksiPenjualan = {
  id: string;
  nomorStruk: string;
  pelangganId?: number | null;
  pelanggan?: Customer | null; // Adjusted relation
  userId: string; // Kasir - Clerk User ID
  tanggalWaktuTransaksi: string; // Use string for simplicity, format as needed
  detailTransaksiPenjualan: DetailTransaksiPenjualan[];
  subtotalSebelumDiskonPajak: number;
  totalDiskonTransaksi?: number;
  totalPajak?: number;
  grandTotal: number;
  statusPembayaran: string;
  statusTransaksi: string;
  paymentGatewayName?: string | null;
  paymentGatewayOrderId?: string | null;
  perluDiantar: boolean;
  alamatPengiriman?: string | null;
  kotaPengiriman?: string | null;
  kodePosPengiriman?: string | null;
  noTelpPenerima?: string | null;
  catatanPengiriman?: string | null;
  biayaPengiriman?: number | null;
  pembayaranTransaksi: PembayaranTransaksi[];
  sesiKasirId?: string | null;
  catatanTransaksi?: string | null;
  createdAt: string;
  updatedAt: string;
  // Assuming 'userId' in TransaksiPenjualan relates to a 'User' model
  // user?: { id: string; name: string }; // Uncomment if you have a User model and relation
};

type SalesReportResponse = {
  data: TransaksiPenjualan[];
  total: number;
  page: number;
  limit: number;
  filters: {
    customers: Customer[];
    categories: Category[];
    items: Item[];
  };
};

export default function SalesReportPage() {
  const [dateRange, setDateRange] = useState<any>(null); // Replace any with DateRange type from date picker
  const [selectedCustomer, setSelectedCustomer] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Fetch sales data using react-query
  const { data, isLoading, error, refetch } = useQuery<SalesReportResponse>({
    queryKey: [
      "salesReport",
      page,
      limit,
      dateRange,
      selectedCustomer,
      selectedCategory,
      selectedItem,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (dateRange?.from)
        params.append("fromDate", format(dateRange.from, "yyyy-MM-dd"));
      if (dateRange?.to)
        params.append("toDate", format(dateRange.to, "yyyy-MM-dd"));
      if (selectedCustomer !== "all")
        params.append("customerId", selectedCustomer);
      if (selectedCategory !== "all")
        params.append("categoryId", selectedCategory);
      if (selectedItem !== "all") params.append("itemId", selectedItem);

      const response = await fetch(
        `/api/reports/sales-summary?${params.toString()}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch sales report");
      }
      return response.json();
    },
  });

  // TODO: Fetch actual customers, categories, and items for filter dropdowns
  const customers = data?.filters.customers || [];
  const categories = data?.filters.categories || [];
  const items = data?.filters.items || [];

  const transactions = data?.data || [];
  const totalTransactions = data?.total || 0;

  const handleExport = () => {
    console.log("Exporting report...");
    // Implement CSV/Excel export logic here, potentially calling a new API endpoint
  };

  const handlePrint = () => {
    console.log("Printing report...");
    window.print(); // Basic print functionality
  };

  const handleApplyFilters = () => {
    setPage(1); // Reset to first page on applying filters
    refetch();
  };

  const handleResetFilters = () => {
    setDateRange(null);
    setSelectedCustomer("all");
    setSelectedCategory("all");
    setSelectedItem("all");
    setPage(1);
    console.log("Filters reset");
    refetch(); // Refetch data with default/no filters
  };

  // Placeholder KPI values - calculate based on filtered transactions
  const totalSales = transactions.reduce(
    (sum, t) => sum + parseFloat((t.grandTotal as any) || "0"),
    0
  );
  const successfulTransactions = totalTransactions; // Use total count from API
  const averageTransactionValue =
    successfulTransactions > 0 ? totalSales / successfulTransactions : 0;
  const totalDiscount = transactions.reduce(
    (sum, t) =>
      sum +
      parseFloat((t.totalDiskonTransaksi as any) || "0") +
      t.detailTransaksiPenjualan.reduce(
        (itemSum, detail) =>
          itemSum + parseFloat((detail.diskonItemNominal as any) || "0"),
        0
      ),
    0
  );
  const totalTax = transactions.reduce(
    (sum, t) => sum + parseFloat((t.totalPajak as any) || "0"),
    0
  );
  const totalShipping = transactions.reduce(
    (sum, t) => sum + parseFloat((t.biayaPengiriman as any) || "0"),
    0
  );

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* I. Area Header & Aksi Utama */}
      <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
        {/* <PageHeader title="Laporan Penjualan" /> */}
        <h1 className="text-2xl font-bold">Laporan Penjualan</h1>
        <div className="flex space-x-2">
          {/*
            <Button onClick={handleExport} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Laporan (CSV)
            </Button>
          */}
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
                  {/* Render fetched customers here */}
                  {customers.map((customer) => (
                    <SelectItem
                      key={customer.id}
                      value={customer.id.toString()}
                    >
                      {customer.nama}
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
                  {/* Render fetched categories here */}
                  {categories.map((category) => (
                    <SelectItem
                      key={category.id}
                      value={category.id.toString()}
                    >
                      {category.nama}
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
                  {/* Render fetched items here */}
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id.toString()}>
                      {item.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button onClick={handleApplyFilters} disabled={isLoading}>
              <Search className="mr-2 h-4 w-4" />
              {isLoading ? "Memuat..." : "Tampilkan Laporan"}
            </Button>
            <Button
              onClick={handleResetFilters}
              variant="outline"
              disabled={isLoading}
            >
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
            <p className="text-2xl font-bold">{totalTransactions}</p>
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
          {isLoading ? (
            <div>Memuat laporan...</div>
          ) : error ? (
            <div>Error: {error.message}</div>
          ) : transactions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Struk</TableHead>
                  <TableHead>Tanggal & Waktu</TableHead>
                  <TableHead>Nama Barang</TableHead>
                  <TableHead>Kategori Barang</TableHead>
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
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>{tx.nomorStruk}</TableCell>
                    <TableCell>
                      {format(
                        new Date(tx.tanggalWaktuTransaksi),
                        "yyyy-MM-dd HH:mm"
                      )}
                    </TableCell>
                    <TableCell>
                      {tx.detailTransaksiPenjualan
                        .map((detail) => detail.item.nama)
                        .join(", ")}
                    </TableCell>
                    <TableCell>
                      {tx.detailTransaksiPenjualan
                        .map((detail) => detail.item.kategori.nama)
                        .join(", ")}
                    </TableCell>
                    <TableCell>{tx.pelanggan?.nama || "Umum"}</TableCell>
                    <TableCell>{tx.userId}</TableCell>
                    {/* TODO: Fetch Kasir name */}
                    <TableCell>
                      {tx.pembayaranTransaksi[0]?.metodePembayaran || "-"}
                    </TableCell>
                    {/* Assuming one payment for simplicity */}
                    <TableCell className="text-right">
                      {tx.subtotalSebelumDiskonPajak.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {(tx.totalDiskonTransaksi || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {(tx.totalPajak || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {(tx.biayaPengiriman || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {tx.grandTotal.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {/* Replace with Badge component */}
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          tx.statusPembayaran === "PAID_VIA_MIDTRANS" ||
                          tx.statusTransaksi === "SELESAI"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {tx.statusTransaksi}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                        Lihat Detail
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center">Tidak ada data transaksi.</div>
          )}

          {/* Add pagination controls here */}
          {totalTransactions > 0 && (
            <div className="flex justify-center mt-4">
              {/* Basic Pagination Controls - Replace with a proper component */}
              <Button
                variant="outline"
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page === 1 || isLoading}
                className="mr-2"
              >
                Sebelumnya
              </Button>
              <span className="self-center">
                Halaman {page} dari {Math.ceil(totalTransactions / limit)}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage((prev) => prev + 1)}
                disabled={page * limit >= totalTransactions || isLoading}
                className="ml-2"
              >
                Berikutnya
              </Button>
            </div>
          )}
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
