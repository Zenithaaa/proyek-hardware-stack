import { NextResponse } from "next/server";
import { prisma } from "@/lib/db"; // Pastikan path ke prisma client Anda benar

type SalesChartDataPoint = { periodLabel: string; sales: number };
type ChartPeriod = "daily" | "weekly" | "monthly";

// Helper functions (getStartDate, formatDateDisplay, getWeekLabel, getMonthLabel) tetap sama ...
// [Pastikan helper functions dari kode sebelumnya ada di sini]
// Helper function to get the start date based on period
function getStartDate(
  period: ChartPeriod,
  referenceDate: Date = new Date()
): Date {
  const startDate = new Date(referenceDate);
  startDate.setHours(0, 0, 0, 0); // Start from the beginning of the day

  switch (period) {
    case "daily":
      startDate.setDate(startDate.getDate() - 6); // Covers a 7-day window including today
      break;
    case "weekly":
      startDate.setDate(startDate.getDate() - (28 - 1)); // Covers a 4-week window (approx 4 weeks back)
      break;
    case "monthly":
      startDate.setMonth(startDate.getMonth() - 5); // Covers a 6-month window
      startDate.setDate(1); // Start from the first day of that month
      break;
  }
  return startDate;
}

// Helper function to format date for display (e.g., "DD MMM")
function formatDateDisplay(date: Date): string {
  const day = date.getDate().toString().padStart(2, "0");
  const month = date.toLocaleString("default", { month: "short" });
  return `${day} ${month}`;
}

// Helper function to get week label (e.g., "W23 '24")
function getWeekLabel(date: Date): string {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(
    ((d.valueOf() - yearStart.valueOf()) / 86400000 + 1) / 7
  );
  return `W${weekNum.toString().padStart(2, "0")} '${d
    .getUTCFullYear()
    .toString()
    .slice(-2)}`;
}

// Helper function to get month label (e.g., "Jan '24")
function getMonthLabel(date: Date): string {
  const month = date.toLocaleString("default", { month: "short" });
  const year = date.getFullYear().toString().slice(-2);
  return `${month} '${year}`;
}

export async function GET(
  request: Request,
  { params }: { params: { itemId: string } }
) {
  // ---- PERBAIKAN DIMULAI DI SINI ----
  // Await 'params' sesuai dengan pesan error Next.js
  const awaitedParams = await params;
  const itemId = parseInt(awaitedParams.itemId, 10);
  // ---- PERBAIKAN SELESAI DI SINI ----

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("periode") as ChartPeriod | null;

  if (isNaN(itemId)) {
    return NextResponse.json({ message: "Invalid item ID" }, { status: 400 });
  }

  if (!period || !["daily", "weekly", "monthly"].includes(period)) {
    return NextResponse.json(
      {
        message:
          "Invalid or missing period parameter. Choose from daily, weekly, monthly.",
      },
      { status: 400 }
    );
  }

  try {
    const itemExists = await prisma.item.findUnique({
      where: { id: itemId },
      select: { id: true },
    });

    if (!itemExists) {
      return NextResponse.json({ message: "Item not found" }, { status: 404 });
    }

    const endDate = new Date();
    const startDate = getStartDate(period, endDate);

    const salesRecords = await prisma.detailTransaksiPenjualan.findMany({
      where: {
        itemId: itemId,
        transaksi: {
          tanggalWaktuTransaksi: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      select: {
        jumlah: true,
        transaksi: {
          select: {
            tanggalTransaksi: true,
          },
        },
      },
      orderBy: {
        transaksi: {
          tanggalTransaksi: "asc",
        },
      },
    });

    const aggregatedSales: Record<string, number> = {};

    salesRecords.forEach((record) => {
      if (!record.transaksi || !record.transaksi.tanggalTransaksi) {
        console.warn(
          "Skipping sales record due to missing transaction date:",
          record
        );
        return;
      }
      const saleDate = new Date(record.transaksi.tanggalTransaksi);
      let label = "";

      switch (period) {
        case "daily":
          label = formatDateDisplay(saleDate);
          break;
        case "weekly":
          const firstDayOfWeek = new Date(saleDate);
          const dayOfWeek = firstDayOfWeek.getDay();
          const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
          firstDayOfWeek.setDate(firstDayOfWeek.getDate() + diffToMonday);
          label = getWeekLabel(firstDayOfWeek);
          break;
        case "monthly":
          label = getMonthLabel(
            new Date(saleDate.getFullYear(), saleDate.getMonth(), 1)
          );
          break;
      }
      aggregatedSales[label] = (aggregatedSales[label] || 0) + record.jumlah;
    });

    const formattedChartData: SalesChartDataPoint[] = [];

    // Logika untuk mengisi gap dan memformat data chart (tetap sama)
    // [Pastikan logika pengisian data chart dari kode sebelumnya ada di sini]
    if (period === "daily") {
      const distinctLabelsInSales = new Set(Object.keys(aggregatedSales));
      const allLabelsInRange = new Set<string>();
      for (
        let d = new Date(startDate);
        d <= endDate;
        d.setDate(d.getDate() + 1)
      ) {
        allLabelsInRange.add(formatDateDisplay(new Date(d)));
      }

      let addedLabelsCount = 0;
      Array.from(distinctLabelsInSales)
        .sort(
          (a, b) =>
            new Date(
              a.split(" ")[1] +
                " " +
                a.split(" ")[0] +
                " " +
                endDate.getFullYear()
            ).getTime() -
            new Date(
              b.split(" ")[1] +
                " " +
                b.split(" ")[0] +
                " " +
                endDate.getFullYear()
            ).getTime()
        )
        .forEach((label) => {
          if (addedLabelsCount < 7) {
            formattedChartData.push({
              periodLabel: label,
              sales: aggregatedSales[label] || 0,
            });
            addedLabelsCount++;
          }
        });

      Array.from(allLabelsInRange).forEach((label) => {
        if (
          addedLabelsCount < 7 &&
          !formattedChartData.find((p) => p.periodLabel === label)
        ) {
          formattedChartData.push({ periodLabel: label, sales: 0 });
          addedLabelsCount++;
        }
      });
      formattedChartData.sort((a, b) => {
        const dateA = new Date(
          a.periodLabel.split(" ")[1] +
            " " +
            a.periodLabel.split(" ")[0] +
            " " +
            endDate.getFullYear()
        );
        const dateB = new Date(
          b.periodLabel.split(" ")[1] +
            " " +
            b.periodLabel.split(" ")[0] +
            " " +
            endDate.getFullYear()
        );
        return dateA.getTime() - dateB.getTime();
      });
      if (formattedChartData.length > 7)
        formattedChartData.splice(0, formattedChartData.length - 7);
    } else if (period === "weekly") {
      const distinctLabelsInSales = new Set(Object.keys(aggregatedSales));
      const allLabelsInRange = new Set<string>();
      for (
        let d = new Date(startDate);
        d <= endDate;
        d.setDate(d.getDate() + 7)
      ) {
        const firstDayOfWeek = new Date(d);
        const dayOfWeek = firstDayOfWeek.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        firstDayOfWeek.setDate(firstDayOfWeek.getDate() + diffToMonday);
        allLabelsInRange.add(getWeekLabel(firstDayOfWeek));
      }

      let addedLabelsCount = 0;
      Array.from(distinctLabelsInSales)
        .sort((a, b) => {
          const weekA = parseInt(a.substring(1, 3));
          const yearA = parseInt(a.substring(5, 7));
          const weekB = parseInt(b.substring(1, 3));
          const yearB = parseInt(b.substring(5, 7));
          if (yearA !== yearB) return yearA - yearB;
          return weekA - weekB;
        })
        .forEach((label) => {
          if (addedLabelsCount < 4) {
            formattedChartData.push({
              periodLabel: label,
              sales: aggregatedSales[label] || 0,
            });
            addedLabelsCount++;
          }
        });

      Array.from(allLabelsInRange).forEach((label) => {
        if (
          addedLabelsCount < 4 &&
          !formattedChartData.find((p) => p.periodLabel === label)
        ) {
          formattedChartData.push({ periodLabel: label, sales: 0 });
          addedLabelsCount++;
        }
      });
      formattedChartData.sort((a, b) => {
        const weekA = parseInt(a.periodLabel.substring(1, 3));
        const yearA = parseInt(a.periodLabel.substring(5, 7));
        const weekB = parseInt(b.periodLabel.substring(1, 3));
        const yearB = parseInt(b.periodLabel.substring(5, 7));
        if (yearA !== yearB) return yearA - yearB;
        return weekA - weekB;
      });
      if (formattedChartData.length > 4)
        formattedChartData.splice(0, formattedChartData.length - 4);
    } else if (period === "monthly") {
      const distinctLabelsInSales = new Set(Object.keys(aggregatedSales));
      const allLabelsInRange = new Set<string>();
      for (let m = 0; m < 6; m++) {
        const monthDate = new Date(
          endDate.getFullYear(),
          endDate.getMonth() - m,
          1
        );
        if (monthDate < new Date(new Date(startDate).setDate(1)) && m > 0)
          break;
        allLabelsInRange.add(getMonthLabel(monthDate));
      }

      let addedLabelsCount = 0;
      Array.from(distinctLabelsInSales)
        .sort((a, b) => {
          const [mAS, yAS] = a.split(" '");
          const dA = new Date(Date.parse(mAS + " 1, 20" + yAS));
          const [mBS, yBS] = b.split(" '");
          const dB = new Date(Date.parse(mBS + " 1, 20" + yBS));
          return dA.getTime() - dB.getTime();
        })
        .forEach((label) => {
          if (addedLabelsCount < 6) {
            formattedChartData.push({
              periodLabel: label,
              sales: aggregatedSales[label] || 0,
            });
            addedLabelsCount++;
          }
        });

      Array.from(allLabelsInRange)
        .reverse()
        .forEach((label) => {
          if (
            addedLabelsCount < 6 &&
            !formattedChartData.find((p) => p.periodLabel === label)
          ) {
            formattedChartData.push({ periodLabel: label, sales: 0 });
            addedLabelsCount++;
          }
        });
      formattedChartData.sort((a, b) => {
        const [mAS, yAS] = a.periodLabel.split(" '");
        const dA = new Date(Date.parse(mAS + " 1, 20" + yAS));
        const [mBS, yBS] = b.periodLabel.split(" '");
        const dB = new Date(Date.parse(mBS + " 1, 20" + yBS));
        return dA.getTime() - dB.getTime();
      });
      if (formattedChartData.length > 6)
        formattedChartData.splice(0, formattedChartData.length - 6);
    }

    return NextResponse.json(formattedChartData, { status: 200 });
  } catch (error) {
    console.error(
      `Error fetching sales data for item ${itemId}, period ${period}:`,
      error
    );
    let errorMessage = "Failed to fetch sales data";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { message: errorMessage, error: String(error) },
      { status: 500 }
    );
  }
}
