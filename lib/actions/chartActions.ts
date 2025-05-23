"use server";

import { prisma } from "@/lib/db";
import { subDays, format, startOfDay, endOfDay } from "date-fns";

interface RevenueDataPoint {
  date: string; // YYYY-MM-DD
  revenue: number;
}

export async function getRevenueChartData(
  timeRange: "7d" | "30d" | "90d"
): Promise<RevenueDataPoint[]> {
  try {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case "7d":
        startDate = subDays(now, 7);
        break;
      case "30d":
        startDate = subDays(now, 30);
        break;
      case "90d":
        startDate = subDays(now, 90);
        break;
      default:
        throw new Error("Invalid time range");
    }

    const transactions = await prisma.transaksiPenjualan.findMany({
      where: {
        tanggalWaktuTransaksi: {
          gte: startOfDay(startDate),
          lte: endOfDay(now), // Include transactions up to the end of today
        },
      },
      orderBy: {
        tanggalWaktuTransaksi: "asc",
      },
      select: {
        tanggalWaktuTransaksi: true,
        grandTotal: true,
      },
    });

    if (!transactions || transactions.length === 0) {
      // Return an empty array or fill with zeros for the date range if preferred
      // For simplicity, returning empty if no transactions.
      // To fill with zeros, you'd iterate from startDate to now and create entries.
      return [];
    }

    const dailyRevenueMap = new Map<string, number>();

    // Initialize map with all days in the range with 0 revenue
    let currentDate = startOfDay(startDate);
    const today = startOfDay(now);
    while (currentDate <= today) {
      dailyRevenueMap.set(format(currentDate, "yyyy-MM-dd"), 0);
      currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
    }

    transactions.forEach((transaction) => {
      const dateStr = format(transaction.tanggalWaktuTransaksi, "yyyy-MM-dd");
      const currentRevenue = dailyRevenueMap.get(dateStr) || 0;
      dailyRevenueMap.set(
        dateStr,
        currentRevenue + Number(transaction.grandTotal)
      );
    });

    const chartData: RevenueDataPoint[] = [];
    dailyRevenueMap.forEach((revenue, date) => {
      chartData.push({ date, revenue });
    });

    // Sort by date as Map iteration order is not guaranteed for all engines if keys were added out of order
    // (though for string keys representing dates, it often is). Explicit sort is safer.
    chartData.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return chartData;
  } catch (error) {
    console.error("Error fetching revenue chart data:", error);
    // Consider how to handle errors in the UI, e.g., return an empty array or throw
    return []; // Or throw error to be caught by the component
  }
}
