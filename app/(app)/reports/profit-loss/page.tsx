"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { DateRange } from "react-day-picker";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { PageHeader } from "@/components/shared/PageHeader"; // Assuming you have this
import { formatCurrency } from "@/lib/utils"; // Assuming you have this utility

interface ProfitLossData {
  reportPeriod: {
    start: string;
    end: string;
  };
  pendapatan: {
    totalPenjualanKotor: number;
    totalDiskonPenjualan: number;
    penjualanBersih: number;
  };
  hpp: {
    totalHpp: number;
  };
  labaKotor: number;
  biayaOperasional?: {
    totalBiayaOperasional: number;
    // rincianBiaya?: { namaBiaya: string; jumlah: number }[]; // Optional detailed breakdown
  };
  labaBersihSebelumPajak: number;
  pajak?: {
    perkiraanPajakPenghasilan: number;
  };
  labaBersihSetelahPajak: number;
  monthlyChartData: { name: string; labaKotor: number; labaBersih: number }[]; // Add type for monthly chart data
}

export default function ProfitLossPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });
  const [reportData, setReportData] = useState<ProfitLossData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [operationalExpenses, setOperationalExpenses] = useState<number>(0); // New state for operational expenses
  const [totalReturPenjualan, setTotalReturPenjualan] = useState<number>(0); // New state for returns

  const fetchReportData = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      setError("Silakan pilih periode laporan.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setReportData(null);

    try {
      const params = new URLSearchParams({
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
        operationalExpenses: operationalExpenses.toString(), // Send operational expenses
        totalReturPenjualan: totalReturPenjualan.toString(), // Send total returns
      });
      const response = await fetch(
        `/api/reports/profit-loss?${params.toString()}`
      );
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Gagal mengambil data laporan");
      }
      const data: ProfitLossData = await response.json();
      setReportData(data);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat memuat laporan.");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data on initial load or when date range changes
  useEffect(() => {
    fetchReportData();
  }, [dateRange]); // Consider if auto-fetch on date change is desired or only via button

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    // Implement PDF/Excel export logic here
    alert("Fungsi ekspor belum diimplementasikan.");
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <PageHeader
        title="Laporan Laba Rugi (Sederhana)"
        description="Gambaran profitabilitas bisnis Anda dalam periode tertentu."
        actions={[
          {
            label: "Export Laporan",
            onClick: handleExport,
            variant: "outline",
          },
          { label: "Cetak Laporan", onClick: handlePrint, variant: "outline" },
        ]}
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filter Laporan</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
          <div className="flex-grow">
            <DatePickerWithRange date={dateRange} setDate={setDateRange} />
          </div>
          <Button
            onClick={fetchReportData}
            disabled={isLoading || !dateRange?.from || !dateRange?.to}
          >
            {isLoading ? "Memuat..." : "Tampilkan Laporan"}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="mb-6 bg-destructive/10">
          <CardContent className="p-4 text-destructive">
            <p className="font-semibold">Error:</p>
            <p>{error}</p>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <Card className="mb-6">
          <CardContent className="p-6 text-center">
            <p>Memuat data laporan...</p>
            {/* You can add a spinner component here */}
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && !reportData && (
        <Card className="mb-6">
          <CardContent className="p-6 text-center">
            <p>
              Silakan pilih periode dan klik "Tampilkan Laporan" untuk melihat
              data.
            </p>
          </CardContent>
        </Card>
      )}

      {reportData && (
        <Card>
          <CardHeader>
            <CardTitle>
              Laporan Laba Rugi Periode:
              {dateRange?.from
                ? new Date(dateRange.from).toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })
                : ""}{" "}
              -{" "}
              {dateRange?.to
                ? new Date(dateRange.to).toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })
                : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Section: Pendapatan */}
              <section>
                <h3 className="text-xl font-semibold mb-2 border-b pb-1">
                  PENDAPATAN (REVENUE)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <p>Total Penjualan Kotor (Bruto):</p>
                  <p className="md:text-right font-medium">
                    {formatCurrency(reportData.pendapatan.totalPenjualanKotor)}
                  </p>
                  <p>(-) Total Diskon Penjualan:</p>
                  <p className="md:text-right font-medium text-red-600">
                    (
                    {formatCurrency(reportData.pendapatan.totalDiskonPenjualan)}
                    )
                  </p>
                  <p className="font-bold border-t pt-1 mt-1">
                    (=) PENJUALAN BERSIH (NET SALES):
                  </p>
                  <p className="md:text-right font-bold border-t pt-1 mt-1">
                    {formatCurrency(reportData.pendapatan.penjualanBersih)}
                  </p>
                </div>
              </section>

              {/* Section: HPP */}
              <section>
                <h3 className="text-xl font-semibold mb-2 border-b pb-1">
                  HARGA POKOK PENJUALAN (HPP) / COGS
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <p>Total HPP:</p>
                  <p className="md:text-right font-medium text-red-600">
                    ({formatCurrency(reportData.hpp.totalHpp)})
                  </p>
                </div>
              </section>

              {/* Section: Laba Kotor */}
              <section>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm mt-2 pt-2 border-t border-dashed">
                  <p className="text-lg font-bold">
                    (=) LABA KOTOR (GROSS PROFIT):
                  </p>
                  <p className="md:text-right text-lg font-bold">
                    {formatCurrency(reportData.labaKotor)}
                  </p>
                </div>
              </section>

              {/* Section: Biaya Operasional (Placeholder) */}
              <section>
                <h3 className="text-xl font-semibold mb-2 border-b pb-1">
                  BIAYA OPERASIONAL
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <p>Total Biaya Operasional (Input Manual):</p>
                  <input
                    type="number"
                    value={operationalExpenses}
                    onChange={(e) =>
                      setOperationalExpenses(Number(e.target.value))
                    }
                    className="md:text-right font-medium border rounded px-2 py-1"
                    placeholder="Masukkan biaya operasional"
                  />
                  <p className="font-semibold">Total Biaya Operasional:</p>
                  <p className="md:text-right font-medium text-red-600">
                    ({formatCurrency(operationalExpenses)})
                  </p>
                </div>
              </section>

              {reportData.biayaOperasional && (
                <section>
                  <h3 className="text-xl font-semibold mb-2 border-b pb-1">
                    BIAYA OPERASIONAL
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    {/* Example: loop through rincianBiaya if available */}
                    {/* {reportData.biayaOperasional.rincianBiaya?.map(biaya => (
                      <React.Fragment key={biaya.namaBiaya}>
                        <p>{biaya.namaBiaya}:</p>
                        <p className="md:text-right font-medium text-red-600">({formatCurrency(biaya.jumlah)})</p>
                      </React.Fragment>
                    ))} */}
                    <p className="font-semibold">Total Biaya Operasional:</p>
                    <p className="md:text-right font-medium text-red-600">
                      (
                      {formatCurrency(
                        reportData.biayaOperasional.totalBiayaOperasional
                      )}
                      )
                    </p>
                  </div>
                </section>
              )}

              {/* Section: Laba Bersih Sebelum Pajak */}
              <section>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm mt-2 pt-2 border-t border-dashed">
                  <p className="text-lg font-bold">
                    (=) LABA BERSIH SEBELUM PAJAK (EBT):
                  </p>
                  <p className="md:text-right text-lg font-bold">
                    {formatCurrency(reportData.labaBersihSebelumPajak)}
                  </p>
                </div>
              </section>

              {/* Section: Pajak (Placeholder) */}
              {reportData.pajak && (
                <section>
                  <h3 className="text-xl font-semibold mb-2 border-b pb-1">
                    PAJAK PENGHASILAN
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    <p>(-) Perkiraan Pajak Penghasilan:</p>
                    <p className="md:text-right font-medium text-red-600">
                      (
                      {formatCurrency(
                        reportData.pajak.perkiraanPajakPenghasilan
                      )}
                      )
                    </p>
                  </div>
                </section>
              )}

              {/* Section: Laba Bersih Setelah Pajak */}
              <section>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm mt-2 pt-2 border-t-2 border-double">
                  <p className="text-xl font-bold text-green-700">
                    (=) LABA BERSIH SETELAH PAJAK (NET PROFIT):
                  </p>
                  <p className="md:text-right text-xl font-bold text-green-700">
                    {formatCurrency(reportData.labaBersihSetelahPajak)}
                  </p>
                </div>
              </section>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Optional: Chart Section */}
      {reportData && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Visualisasi Laba (Contoh)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={reportData.monthlyChartData} // Use actual data here
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  formatter={(value) => formatCurrency(value as number)}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="labaKotor"
                  stroke="#8884d8"
                  activeDot={{ r: 8 }}
                  name="Laba Kotor"
                />
                <Line
                  type="monotone"
                  dataKey="labaBersih"
                  stroke="#82ca9d"
                  name="Laba Bersih"
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground mt-2">
              *Grafik ini menampilkan data aktual berdasarkan periode yang
              dipilih.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
