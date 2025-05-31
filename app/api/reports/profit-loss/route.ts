{/*import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  Prisma,
  TransaksiPenjualan,
  DetailTransaksiPenjualan,
} from "@prisma/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const operationalExpensesParam = searchParams.get("operationalExpenses");
    const totalReturPenjualanParam = searchParams.get("totalReturPenjualan");

    if (!startDateParam || !endDateParam) {
      return NextResponse.json(
        { error: "Missing startDate or endDate parameters" },
        { status: 400 }
      );
    }

    const startDate = new Date(startDateParam);
    const endDate = new Date(endDateParam);
    const operationalExpenses = operationalExpensesParam
      ? new Prisma.Decimal(operationalExpensesParam)
      : new Prisma.Decimal(0);
    const totalReturPenjualan = totalReturPenjualanParam
      ? new Prisma.Decimal(totalReturPenjualanParam)
      : new Prisma.Decimal(0);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      );
    }

    // Ensure endDate includes the entire day
    endDate.setHours(23, 59, 59, 999);

    // Fetch all relevant transactions within the date range
    const transactions = await prisma.transaksiPenjualan.findMany({
      where: {
        tanggalWaktuTransaksi: {
          gte: startDate,
          lte: endDate,
        },
        // Consider adding status filtering if needed, e.g., only 'SELESAI' transactions
        // statusTransaksi: 'SELESAI',
      },
      include: {
        detailTransaksiPenjualan: {
          select: {
            jumlah: true,
            hargaJualSaatTransaksi: true,
            hargaBeliSaatTransaksi: true,
            diskonItemNominal: true,
          },
        },
      },
    });

    let totalPenjualanKotor = new Prisma.Decimal(0);
    let totalDiskonPenjualan = new Prisma.Decimal(0);
    let totalHpp = new Prisma.Decimal(0);

    // Aggregate data for the overall report
    transactions.forEach(
      (
        transaction: TransaksiPenjualan & {
          detailTransaksiPenjualan: DetailTransaksiPenjualan[];
        }
      ) => {
        totalDiskonPenjualan = totalDiskonPenjualan.plus(
          transaction.totalDiskonTransaksi || 0
        );

        transaction.detailTransaksiPenjualan.forEach(
          (detail: DetailTransaksiPenjualan) => {
            const subtotalItemKotor = new Prisma.Decimal(detail.jumlah).times(
              detail.hargaJualSaatTransaksi
            );
            totalPenjualanKotor = totalPenjualanKotor.plus(subtotalItemKotor);
            totalDiskonPenjualan = totalDiskonPenjualan.plus(
              detail.diskonItemNominal || 0
            );

            if (detail.hargaBeliSaatTransaksi !== null) {
              const hppItem = new Prisma.Decimal(detail.jumlah).times(
                detail.hargaBeliSaatTransaksi
              );
              totalHpp = totalHpp.plus(hppItem);
            } else {
              console.warn(
                `Item ID ${detail.itemId} in transaction ${transaction.id} has no hargaBeliSaatTransaksi. HPP calculation may be inaccurate.`
              );
            }
          }
        );
      }
    );

    const penjualanBersih = totalPenjualanKotor
      .minus(totalDiskonPenjualan)
      .minus(totalReturPenjualan);
    const labaKotor = penjualanBersih.minus(totalHpp);

    // Placeholder for operational expenses and tax
    // const totalBiayaOperasional = new Prisma.Decimal(0); // This will now come from frontend
    const perkiraanPajakPenghasilan = new Prisma.Decimal(0);

    const labaBersihSebelumPajak = labaKotor.minus(operationalExpenses);
    const labaBersihSetelahPajak = labaBersihSebelumPajak.minus(
      perkiraanPajakPenghasilan
    );

    // Aggregate data for the chart by month
    const monthlyDataMap = new Map<
      string,
      { labaKotor: Prisma.Decimal; labaBersih: Prisma.Decimal }
    >();

    transactions.forEach((transaction) => {
      const transactionDate = new Date(transaction.tanggalWaktuTransaksi);
      const monthYear = `${transactionDate.getFullYear()}-${
        transactionDate.getMonth() + 1
      }`;

      if (!monthlyDataMap.has(monthYear)) {
        monthlyDataMap.set(monthYear, {
          labaKotor: new Prisma.Decimal(0),
          labaBersih: new Prisma.Decimal(0),
        });
      }

      let monthlyPenjualanBersih = new Prisma.Decimal(0);
      let monthlyHpp = new Prisma.Decimal(0);
      let monthlyDiskonPenjualan =
        transaction.totalDiskonTransaksi || new Prisma.Decimal(0);

      transaction.detailTransaksiPenjualan.forEach((detail) => {
        const subtotalItemKotor = new Prisma.Decimal(detail.jumlah).times(
          detail.hargaJualSaatTransaksi
        );
        monthlyPenjualanBersih = monthlyPenjualanBersih.plus(subtotalItemKotor);
        monthlyDiskonPenjualan = monthlyDiskonPenjualan.plus(
          detail.diskonItemNominal || 0
        );
          );
        if (detail.hargaBeliSaatTransaksi !== null) {
          const hppItem = new Prisma.Decimal(detail.jumlah).times(
            detail.hargaBeliSaatTransaksi
          );
          monthlyHpp = monthlyHpp.plus(hppItem);
        }
      });
        });
      monthlyPenjualanBersih = monthlyPenjualanBersih.minus(
        monthlyDiskonPenjualan
      );
      const monthlyLabaKotor = monthlyPenjualanBersih.minus(monthlyHpp);
      // For simplicity, assuming no monthly operational costs or taxes in this aggregation
      const monthlyLabaBersih = monthlyLabaKotor; // Or subtract prorated expenses/taxes if available
        const monthlyLabaBersih = monthlyLabaKotor; // Or subtract prorated expenses/taxes if available
      const currentMonthData = monthlyDataMap.get(monthYear)!;
      currentMonthData.labaKotor =
        currentMonthData.labaKotor.plus(monthlyLabaKotor);
      currentMonthData.labaBersih =
        currentMonthData.labaBersih.plus(monthlyLabaBersih);
      }
    });

    // Convert map to array and sort by date
    const monthlyChartData = Array.from(monthlyDataMap.entries())
      .map(([monthYear, data]) => {
        const [year, month] = monthYear.split("-").map(Number);
        const date = new Date(year, month - 1);
        return { date, ...data };
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((item) => ({
        name: item.date.toLocaleDateString("id-ID", {
          month: "short",
          year: "2-digit",
        }), // Format for chart label
        labaKotor: item.labaKotor.toNumber(),
        labaBersih: item.labaBersih.toNumber(),
      }));

    const reportData = {
      reportPeriod: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      pendapatan: {
        totalPenjualanKotor: totalPenjualanKotor.toNumber(),
        totalDiskonPenjualan: totalDiskonPenjualan.toNumber(),
        penjualanBersih: penjualanBersih.toNumber(),
      },
      hpp: {
        totalHpp: totalHpp.toNumber(),
      },
      labaKotor: labaKotor.toNumber(),
      biayaOperasional: {
        // Include even if 0 for structure
        totalBiayaOperasional: operationalExpenses.toNumber(),
      },
      labaBersihSebelumPajak: labaBersihSebelumPajak.toNumber(),
      pajak: {
        // Include even if 0 for structure
        perkiraanPajakPenghasilan: perkiraanPajakPenghasilan.toNumber(),
      },
      labaBersihSetelahPajak: labaBersihSetelahPajak.toNumber(),
      monthlyChartData: monthlyChartData, // Add monthly data for chart
    };
    return NextResponse.json(reportData);
*/}