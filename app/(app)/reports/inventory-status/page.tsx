"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { History, FileDown, Printer } from "lucide-react";
import { DateRange } from "react-day-picker";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

// Updated interfaces to match API response
interface StockItem {
  id: string;
  kodeBarang: string;
  namaBarang: string;
  kategori: string;
  supplier: string;
  satuan: string;
  stokSaatIni: number;
  stokMinimum: number;
  statusStok: "Aman" | "Menipis" | "Habis";
  hargaBeliSatuan: number;
  nilaiStokHPP: number;
  hargaJualSatuan: number;
  nilaiStokHargaJual: number;
}

interface StockMovement {
  id?: string; // id might not be directly from DB for combined movements
  tanggal: string;
  noReferensi: string;
  jenisTransaksi: string;
  kuantitasMasuk: number | null;
  kuantitasKeluar: number | null;
  saldoAkhir: number;
}

interface KpiData {
  totalSKU: number;
  totalInventoryValueHPP: number;
  totalInventoryValueHargaJual: number;
  lowStockItemsCount: number;
  outOfStockItemsCount: number;
}

const initialKpis: KpiData = {
  totalSKU: 0,
  totalInventoryValueHPP: 0,
  totalInventoryValueHargaJual: 0,
  lowStockItemsCount: 0,
  outOfStockItemsCount: 0,
};

export default function InventoryStatusPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [categories, setCategories] = React.useState<
    { id: string; nama: string }[]
  >([]);
  const [suppliers, setSuppliers] = React.useState<
    { id: string; nama: string }[]
  >([]);

  const [stockItems, setStockItems] = React.useState<StockItem[]>([]);
  const [kpis, setKpis] = React.useState<KpiData>(initialKpis);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [currentPage, setCurrentPage] = React.useState(
    Number(searchParams.get("page")) || 1
  );
  const [totalPages, setTotalPages] = React.useState(1);
  const [limit, setLimit] = React.useState(
    Number(searchParams.get("limit")) || 10
  );

  const [searchTerm, setSearchTerm] = React.useState(
    searchParams.get("search") || ""
  );
  const [selectedCategoryId, setSelectedCategoryId] = React.useState(
    searchParams.get("categoryId") || "semua"
  );
  const [selectedSupplierId, setSelectedSupplierId] = React.useState(
    searchParams.get("supplierId") || "semua"
  );
  const [selectedStockStatus, setSelectedStockStatus] = React.useState(
    searchParams.get("stockStatus") || "semua"
  );

  const [selectedItemForStockCard, setSelectedItemForStockCard] =
    React.useState<StockItem | null>(null);
  const [stockCardMovements, setStockCardMovements] = React.useState<
    StockMovement[]
  >([]);
  const [isStockCardLoading, setIsStockCardLoading] = React.useState(false);
  const [stockCardDateRange, setStockCardDateRange] = React.useState<
    DateRange | undefined
  >();

  const fetchInventoryData = React.useCallback(
    async (page = 1, currentLimit = 10) => {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", currentLimit.toString());
      if (searchTerm) params.append("search", searchTerm);
      if (selectedCategoryId !== "semua")
        params.append("categoryId", selectedCategoryId);
      if (selectedSupplierId !== "semua")
        params.append("supplierId", selectedSupplierId);
      if (selectedStockStatus !== "semua")
        params.append("stockStatus", selectedStockStatus);

      // Update URL search params without page reload, for bookmarking/sharing
      router.push(`${pathname}?${params.toString()}`, { scroll: false });

      try {
        const response = await fetch(
          `/api/reports/inventory-status?${params.toString()}`
        );
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error ||
              `Failed to fetch inventory data: ${response.statusText}`
          );
        }
        const result = await response.json();
        setStockItems(result.data || []);
        setKpis(result.kpi || initialKpis);
        setCurrentPage(result.meta.currentPage || 1);
        setTotalPages(result.meta.totalPages || 1);
        // setLimit(result.meta.limit || 10); // Limit is part of request, not response meta typically
      } catch (err: any) {
        setError(err.message);
        setStockItems([]);
        setKpis(initialKpis);
      } finally {
        setIsLoading(false);
      }
    },
    [
      searchTerm,
      selectedCategoryId,
      selectedSupplierId,
      selectedStockStatus,
      router,
      pathname,
    ]
  );

  React.useEffect(() => {
    const pageFromUrl = Number(searchParams.get("page")) || 1;
    const limitFromUrl = Number(searchParams.get("limit")) || 10;
    // Update state from URL on initial load or when URL changes externally
    setSearchTerm(searchParams.get("search") || "");
    setSelectedCategoryId(searchParams.get("categoryId") || "semua");
    setSelectedSupplierId(searchParams.get("supplierId") || "semua");
    setSelectedStockStatus(searchParams.get("stockStatus") || "semua");
    setLimit(limitFromUrl);

    fetchInventoryData(pageFromUrl, limitFromUrl);
  }, [searchParams, fetchInventoryData]); // fetchInventoryData is memoized

  const handleApplyFilter = () => {
    fetchInventoryData(1, limit); // Reset to page 1 on new filter
  };

  const handleResetFilter = () => {
    setSearchTerm("");
    setSelectedCategoryId("semua");
    setSelectedSupplierId("semua");
    setSelectedStockStatus("semua");
    // Clear URL params and fetch. fetchInventoryData will be called by useEffect due to searchParams change.
    router.push(pathname, { scroll: false });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      // fetchInventoryData will be called by useEffect due to searchParams change
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", newPage.toString());
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    }
  };

  const fetchStockCardData = async (itemId: string, dateRange?: DateRange) => {
    if (!itemId) return;
    setIsStockCardLoading(true);
    const params = new URLSearchParams();
    if (dateRange?.from)
      params.append("startDate", dateRange.from.toISOString());
    if (dateRange?.to) params.append("endDate", dateRange.to.toISOString());

    try {
      const response = await fetch(
        `/api/reports/inventory-status/${itemId}/stock-card?${params.toString()}`
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch stock card data");
      }
      const result = await response.json();
      setStockCardMovements(result.data || []);
    } catch (err: any) {
      console.error(err);
      setStockCardMovements([]);
      // Optionally show error to user in dialog
      alert(`Error fetching stock card: ${err.message}`);
    } finally {
      setIsStockCardLoading(false);
    }
  };

  React.useEffect(() => {
    if (selectedItemForStockCard?.id) {
      fetchStockCardData(selectedItemForStockCard.id, stockCardDateRange);
    }
  }, [selectedItemForStockCard, stockCardDateRange]); // Removed fetchStockCardData from deps as it's not memoized and causes loop

  const handleExport = () => {
    if (stockItems.length === 0) {
      alert("Tidak ada data untuk diekspor.");
      return;
    }

    const headers = [
      "Kode Barang",
      "Nama Barang",
      "Kategori",
      "Supplier",
      "Satuan",
      "Stok Saat Ini",
      "Stok Minimum",
      "Status Stok",
      "Harga Beli (Rp)",
      "Nilai Stok HPP (Rp)",
      "Harga Jual (Rp)",
      "Nilai Stok Jual (Rp)",
    ];

    const csv = [headers.join(",")];

    stockItems.forEach((item) => {
      const row = [
        `"${item.kodeBarang}"`,
        `"${item.namaBarang}"`,
        `"${item.kategori}"`,
        `"${item.supplier}"`,
        `"${item.satuan}"`,
        item.stokSaatIni,
        item.stokMinimum,
        `"${item.statusStok}"`,
        item.hargaBeliSatuan,
        item.nilaiStokHPP,
        item.hargaJualSatuan,
        item.nilaiStokHargaJual,
      ];
      csv.push(row.join(","));
    });

    const csvString = csv.join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "laporan_stok_barang.csv");
    link.click();
  };

  const handlePrint = () => console.log("Printing report..."); // TODO: Implement print functionality

  React.useEffect(() => {
    async function fetchFilterOptions() {
      try {
        const [categoriesRes, suppliersRes] = await Promise.all([
          fetch("/api/inventory/categories"),
          fetch("/api/suppliers/get-all"), // Assuming this endpoint exists or will be created
        ]);

        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          setCategories(categoriesData.data || []);
        }

        if (suppliersRes.ok) {
          const suppliersData = await suppliersRes.json();
          setSuppliers(suppliersData.data || []);
        }
      } catch (error) {
        console.error("Failed to fetch filter options:", error);
      }
    }
    fetchFilterOptions();
  }, []);

  if (isLoading && stockItems.length === 0 && currentPage === 1) {
    // Show loading only on initial load or full filter change
    return (
      <div className="container mx-auto p-4 text-center">
        Memuat data laporan stok...
      </div>
    );
  }

  if (error && stockItems.length === 0) {
    // Show error if loading fails and no data is present
    return (
      <div className="container mx-auto p-4 text-red-500 text-center">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* I. Area Header & Aksi Utama */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Laporan Stok Barang</h1>
        <div className="space-x-2">
          <Button variant="outline" onClick={handleExport}>
            <Printer className="mr-2 h-4 w-4" /> Cetak Laporan Stok
          </Button>
        </div>
      </div>

      {/* II. Area Filter Laporan Stok */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Laporan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              placeholder="Cari Kode Barang / Nama Barang"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleApplyFilter()} // Optional: filter on Enter
            />
            <Select
              value={selectedCategoryId}
              onValueChange={setSelectedCategoryId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Semua Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Kategori</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedSupplierId}
              onValueChange={setSelectedSupplierId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Semua Supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Supplier</SelectItem>
                {suppliers.map((sup) => (
                  <SelectItem key={sup.id} value={sup.id.toString()}>
                    {sup.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedStockStatus}
              onValueChange={setSelectedStockStatus}
            >
              <SelectTrigger>
                <SelectValue placeholder="Semua Status Stok" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua</SelectItem>
                <SelectItem value="aman">Stok Aman</SelectItem>
                <SelectItem value="menipis">Stok Menipis</SelectItem>
                <SelectItem value="habis">Stok Habis</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end space-x-2">
            <Button onClick={handleApplyFilter} disabled={isLoading}>
              {isLoading ? "Memuat..." : "Tampilkan Laporan"}
            </Button>
            <Button
              variant="ghost"
              onClick={handleResetFilter}
              disabled={isLoading}
            >
              Reset Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* III. Area Ringkasan/KPI Stok */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Item Berbeda (SKU)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "-" : kpis.totalSKU}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Nilai Inventaris (HPP)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading
                ? "-"
                : `Rp ${kpis.totalInventoryValueHPP.toLocaleString()}`}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Nilai Inventaris (Harga Jual)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading
                ? "-"
                : `Rp ${kpis.totalInventoryValueHargaJual.toLocaleString()}`}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Jumlah Item Stok Menipis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "-" : kpis.lowStockItemsCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Jumlah Item Stok Habis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "-" : kpis.outOfStockItemsCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* IV. Tabel Status Stok Saat Ini */}
      <Card>
        <CardHeader>
          <CardTitle>Status Stok Saat Ini</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <p className="text-center py-4">Memuat data tabel...</p>
          )}
          {!isLoading && error && (
            <p className="text-center py-4 text-red-500">
              Gagal memuat data: {error}
            </p>
          )}
          {!isLoading && !error && stockItems.length === 0 && (
            <p className="text-center py-4">
              Tidak ada data stok yang cocok dengan filter.
            </p>
          )}
          {!isLoading && !error && stockItems.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode Barang</TableHead>
                  <TableHead>Nama Barang</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Satuan</TableHead>
                  <TableHead className="text-right">Stok Saat Ini</TableHead>
                  <TableHead className="text-right">Stok Minimum</TableHead>
                  <TableHead>Status Stok</TableHead>
                  <TableHead className="text-right">Harga Beli (Rp)</TableHead>
                  <TableHead className="text-right">
                    Nilai Stok HPP (Rp)
                  </TableHead>
                  <TableHead className="text-right">Harga Jual (Rp)</TableHead>
                  <TableHead className="text-right">
                    Nilai Stok Jual (Rp)
                  </TableHead>
                  {/* 
                  <TableHead className="text-center">Aksi</TableHead>
                  */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.kodeBarang}</TableCell>
                    <TableCell>{item.namaBarang}</TableCell>
                    <TableCell>{item.kategori}</TableCell>
                    <TableCell>{item.supplier}</TableCell>
                    <TableCell>{item.satuan}</TableCell>
                    <TableCell className="text-right">
                      {item.stokSaatIni}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.stokMinimum}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full 
                        ${
                          item.stokSaatIni === 0
                            ? "bg-red-100 text-red-800"
                            : item.stokSaatIni < 10
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {item.statusStok}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {item.hargaBeliSatuan.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.nilaiStokHPP.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.hargaJualSatuan.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.nilaiStokHargaJual.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <Dialog
                        open={selectedItemForStockCard?.id === item.id}
                        onOpenChange={(open) => {
                          if (open) {
                            setSelectedItemForStockCard(item);
                            setStockCardDateRange(undefined); // Reset date range for new item
                          } else {
                            setSelectedItemForStockCard(null);
                            setStockCardMovements([]); // Clear movements when dialog closes
                          }
                        }}
                      >
                        {/*
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <History className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        */}
                        {selectedItemForStockCard && (
                          <DialogContent className="max-w-3xl">
                            <DialogHeader>
                              <DialogTitle>
                                Kartu Stok:{" "}
                                {selectedItemForStockCard.namaBarang} (
                                {selectedItemForStockCard.kodeBarang})
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <DatePickerWithRange
                                date={stockCardDateRange}
                                onDateChange={(range) => {
                                  setStockCardDateRange(range);
                                  // fetchStockCardData will be called by useEffect
                                }}
                                className="max-w-sm"
                              />
                              {isStockCardLoading && (
                                <p className="text-center py-2">
                                  Memuat kartu stok...
                                </p>
                              )}
                              {!isStockCardLoading &&
                                stockCardMovements.length === 0 && (
                                  <p className="text-center py-2">
                                    Tidak ada pergerakan stok untuk periode ini
                                    atau item ini.
                                  </p>
                                )}
                              {!isStockCardLoading &&
                                stockCardMovements.length > 0 && (
                                  <div className="max-h-96 overflow-y-auto">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Tanggal</TableHead>
                                          <TableHead>No. Referensi</TableHead>
                                          <TableHead>Jenis Transaksi</TableHead>
                                          <TableHead className="text-right">
                                            Masuk
                                          </TableHead>
                                          <TableHead className="text-right">
                                            Keluar
                                          </TableHead>
                                          <TableHead className="text-right">
                                            Saldo Akhir
                                          </TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {stockCardMovements.map(
                                          (move, index) => (
                                            <TableRow
                                              key={`${move.noReferensi}-${index}-${move.tanggal}`}
                                            >
                                              <TableCell>
                                                {new Date(
                                                  move.tanggal
                                                ).toLocaleDateString()}
                                              </TableCell>
                                              <TableCell>
                                                {move.noReferensi}
                                              </TableCell>
                                              <TableCell>
                                                {move.jenisTransaksi}
                                              </TableCell>
                                              <TableCell className="text-right">
                                                {move.kuantitasMasuk ?? "-"}
                                              </TableCell>
                                              <TableCell className="text-right">
                                                {move.kuantitasKeluar ?? "-"}
                                              </TableCell>
                                              <TableCell className="text-right">
                                                {move.saldoAkhir}
                                              </TableCell>
                                            </TableRow>
                                          )
                                        )}
                                      </TableBody>
                                    </Table>
                                  </div>
                                )}
                            </div>
                          </DialogContent>
                        )}
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* V. Area Paginasi */}
      <div className="flex items-center justify-between px-2">
        <div className="flex-1 text-sm text-muted-foreground">
          Menampilkan {stockItems.length} dari {kpis.totalSKU} item.
        </div>
        <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Baris per halaman</p>
            <Select
              value={`${limit}`}
              onValueChange={(value) => {
                setLimit(Number(value));
                handlePageChange(1); // Reset to first page when limit changes
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={limit} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 40, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Page {currentPage} dari {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
            >
              <span className="sr-only">Go to first page</span>
              {"<<"}
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <span className="sr-only">Go to previous page</span>
              {"<"}
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <span className="sr-only">Go to next page</span>
              {">"}
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
            >
              <span className="sr-only">Go to last page</span>
              {">>"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
