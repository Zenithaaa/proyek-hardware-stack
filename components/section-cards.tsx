import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { IconTrendingUp, IconTrendingDown } from "@tabler/icons-react"; // Using lucide-react
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

// Helper to format currency to IDR
const formatCurrency = (amount: number | bigint | null | undefined) => {
  if (amount === null || amount === undefined) {
    amount = 0;
  }
  const numericAmount = typeof amount === "bigint" ? Number(amount) : amount;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numericAmount);
};

// Helper to format percentage
const formatPercentage = (value: number | null | undefined) => {
  if (
    value === null ||
    value === undefined ||
    isNaN(value) ||
    !isFinite(value)
  ) {
    return "0.0%";
  }
  const fixedValue = parseFloat(value.toFixed(1));
  return `${fixedValue >= 0 ? "+" : ""}${fixedValue.toFixed(1)}%`;
};

// Helper to calculate percentage change
const calculatePercentageChange = (current: number, previous: number) => {
  if (previous === 0) {
    return current > 0 ? 100 : 0; // If previous was 0, any increase is 100% (or 0 if current is also 0)
  }
  const change = ((current - previous) / previous) * 100;
  return parseFloat(change.toFixed(1)); // Return a number, formatting is separate
};

const now = new Date();
const firstDayCurrentMonth = startOfMonth(now);
const lastDayCurrentMonth = endOfMonth(now);
const firstDayPreviousMonth = startOfMonth(subMonths(now, 1));
const lastDayPreviousMonth = endOfMonth(subMonths(now, 1));

export default async function SectionCards() {
  // 1. Total Pendapatan (Revenue)
  const [revenueCurrentMonthData, revenuePreviousMonthData] = await Promise.all(
    [
      prisma.transaksiPenjualan.aggregate({
        _sum: { grandTotal: true },
        where: {
          tanggalTransaksi: {
            gte: firstDayCurrentMonth,
            lte: lastDayCurrentMonth,
          },
        },
      }),
      prisma.transaksiPenjualan.aggregate({
        _sum: { grandTotal: true },
        where: {
          tanggalTransaksi: {
            gte: firstDayPreviousMonth,
            lte: lastDayPreviousMonth,
          },
        },
      }),
    ]
  );
  const totalRevenueCurrentMonth = Number(
    revenueCurrentMonthData._sum.grandTotal || 0
  );
  const totalRevenuePreviousMonth = Number(
    revenuePreviousMonthData._sum.grandTotal || 0
  );
  const revenuePercentageChange = calculatePercentageChange(
    totalRevenueCurrentMonth,
    totalRevenuePreviousMonth
  );

  // 2. Total Pelanggan (Customers)
  const [
    totalCustomersData,
    customersAddedCurrentMonthData,
    customersAddedPreviousMonthData,
  ] = await Promise.all([
    prisma.pelanggan.count(),
    prisma.pelanggan.count({
      where: {
        tanggalRegistrasi: {
          gte: firstDayCurrentMonth,
          lte: lastDayCurrentMonth,
        },
      },
    }),
    prisma.pelanggan.count({
      where: {
        tanggalRegistrasi: {
          gte: firstDayPreviousMonth,
          lte: lastDayPreviousMonth,
        },
      },
    }),
  ]);
  const totalPelanggan = totalCustomersData;
  const newCustomersCurrentMonth = customersAddedCurrentMonthData;
  const newCustomersPreviousMonth = customersAddedPreviousMonthData;
  const customerPercentageChange = calculatePercentageChange(
    newCustomersCurrentMonth,
    newCustomersPreviousMonth
  );

  // 3. Total Penjualan (Sales)
  const [salesCurrentMonthData, salesPreviousMonthData] = await Promise.all([
    prisma.transaksiPenjualan.count({
      where: {
        tanggalTransaksi: {
          gte: firstDayCurrentMonth,
          lte: lastDayCurrentMonth,
        },
      },
    }),
    prisma.transaksiPenjualan.count({
      where: {
        tanggalTransaksi: {
          gte: firstDayPreviousMonth,
          lte: lastDayPreviousMonth,
        },
      },
    }),
  ]);
  const totalSalesCurrentMonth = salesCurrentMonthData;
  const totalSalesPreviousMonth = salesPreviousMonthData;
  const salesPercentageChange = calculatePercentageChange(
    totalSalesCurrentMonth,
    totalSalesPreviousMonth
  );

  // 4. Total Supplier (NOW WITH ACCURATE MONTHLY TREND using createdAt)
  const [
    totalSuppliersData,
    suppliersAddedCurrentMonthData,
    suppliersAddedPreviousMonthData,
  ] = await Promise.all([
    prisma.supplier.count(), // Total number of suppliers
    prisma.supplier.count({
      // Suppliers added this month
      where: {
        createdAt: {
          // Using the createdAt field (ensure Prisma client is updated)
          gte: firstDayCurrentMonth,
          lte: lastDayCurrentMonth,
        },
      },
    }),
    prisma.supplier.count({
      // Suppliers added last month
      where: {
        createdAt: {
          // Using the createdAt field (ensure Prisma client is updated)
          gte: firstDayPreviousMonth,
          lte: lastDayPreviousMonth,
        },
      },
    }),
  ]);

  const totalSuppliers = totalSuppliersData;
  const newSuppliersCurrentMonth = suppliersAddedCurrentMonthData;
  const newSuppliersPreviousMonth = suppliersAddedPreviousMonthData;
  const supplierPercentageChange = calculatePercentageChange(
    newSuppliersCurrentMonth,
    newSuppliersPreviousMonth
  );

  return (
    <div className="grid sm:grid-cols-2 gap-4 px-4 *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:bg-gradient-to-t dark:*:data-[slot=card]:bg-card *:data-[slot=card]:shadow-xs lg:px-6">
      {/* Card Total Pendapatan */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Pendapatan</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatCurrency(totalRevenueCurrentMonth)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="flex items-center">
              {revenuePercentageChange >= 0 ? (
                <IconTrendingUp className="mr-1 h-4 w-4" />
              ) : (
                <IconTrendingDown className="mr-1 h-4 w-4" />
              )}
              {formatPercentage(revenuePercentageChange)}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium items-center">
            {revenuePercentageChange >= 0 ? "Trending up" : "Trending down"}{" "}
            this month
            {revenuePercentageChange >= 0 ? (
              <IconTrendingUp className="size-4" />
            ) : (
              <IconTrendingDown className="size-4" />
            )}
          </div>
          <div className="text-muted-foreground">
            Pendapatan 1 bulan terakhir
          </div>
        </CardFooter>
      </Card>

      {/* Card Total Pelanggan */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Pelanggan</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {totalPelanggan.toLocaleString("id-ID")}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="flex items-center">
              {customerPercentageChange >= 0 ? (
                <IconTrendingUp className="mr-1 h-4 w-4" />
              ) : (
                <IconTrendingDown className="mr-1 h-4 w-4" />
              )}
              {formatPercentage(customerPercentageChange)}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium items-center">
            {customerPercentageChange >= 0 ? "Trending up" : "Trending down"}{" "}
            this month
            {customerPercentageChange >= 0 ? (
              <IconTrendingUp className="size-4" />
            ) : (
              <IconTrendingDown className="size-4" />
            )}
          </div>
          <div className="text-muted-foreground">
            Pelanggan baru 1 bulan terakhir
          </div>
        </CardFooter>
      </Card>

      {/* Card Total Penjualan */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Penjualan</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {totalSalesCurrentMonth.toLocaleString("id-ID")}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="flex items-center">
              {salesPercentageChange >= 0 ? (
                <IconTrendingUp className="mr-1 h-4 w-4" />
              ) : (
                <IconTrendingDown className="mr-1 h-4 w-4" />
              )}
              {formatPercentage(salesPercentageChange)}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium items-center">
            {salesPercentageChange >= 0 ? "Trending up" : "Trending down"} this
            month
            {salesPercentageChange >= 0 ? (
              <IconTrendingUp className="size-4" />
            ) : (
              <IconTrendingDown className="size-4" />
            )}
          </div>
          <div className="text-muted-foreground">
            Penjualan 1 bulan terakhir
          </div>
        </CardFooter>
      </Card>

      {/* Card Total Supplier (with accurate monthly trend) */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Supplier</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {totalSuppliers.toLocaleString("id-ID")}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="flex items-center">
              {supplierPercentageChange >= 0 ? (
                <IconTrendingUp className="mr-1 h-4 w-4" />
              ) : (
                <IconTrendingDown className="mr-1 h-4 w-4" />
              )}
              {formatPercentage(supplierPercentageChange)}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium items-center">
            {supplierPercentageChange >= 0 ? "Trending up" : "Trending down"}{" "}
            this month
            {supplierPercentageChange >= 0 ? (
              <IconTrendingUp className="size-4" />
            ) : (
              <IconTrendingDown className="size-4" />
            )}
          </div>
          <div className="text-muted-foreground">
            Supplier baru 1 bulan terakhir
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
