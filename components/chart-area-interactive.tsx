"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts"; // Added YAxis, Tooltip
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip as ShadcnChartTooltip, // Renamed to avoid conflict with Recharts' Tooltip
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { getRevenueChartData } from "@/lib/actions/chartActions"; // Adjust path if needed

interface RevenueDataPoint {
  date: string;
  revenue: number;
}

const chartConfig = {
  revenue: {
    label: " Pendapatan",
    color: "hsl(var(--chart-1))", // Using a variable from shadcn/ui theme
  },
} satisfies ChartConfig;

const formatCurrencyForAxis = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)} Jt`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)} Rb`;
  return value.toString();
};

const formatCurrencyForTooltip = (value: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function ChartAreaInteractive() {
  const isMobileHook = useIsMobile(); // Renamed to avoid conflict
  const [timeRange, setTimeRange] = React.useState<"7d" | "30d" | "90d">("30d");
  const [chartData, setChartData] = React.useState<RevenueDataPoint[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [totalForPeriod, setTotalForPeriod] = React.useState(0);

  React.useEffect(() => {
    if (isMobileHook) {
      // By default, if mobile, set to 7d, but allow user to change it
      // Only set if current timeRange is not already 7d to avoid loop if logic is more complex
      // setTimeRange("7d"); // This might cause an extra fetch, consider if default state should be different
    }
  }, [isMobileHook]);

  React.useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const data = await getRevenueChartData(timeRange);
        setChartData(data);
        const currentTotal = data.reduce((sum, item) => sum + item.revenue, 0);
        setTotalForPeriod(currentTotal);
      } catch (error) {
        console.error("Failed to fetch chart data:", error);
        setChartData([]); // Set to empty on error
        setTotalForPeriod(0);
      }
      setIsLoading(false);
    }
    fetchData();
  }, [timeRange]);

  const getTimeRangeDescription = () => {
    switch (timeRange) {
      case "7d":
        return "7 hari terakhir";
      case "30d":
        return "30 hari terakhir";
      case "90d":
        return "3 bulan terakhir"; // Approx. 90 days
      default:
        return "";
    }
  };

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Total Pendapatan Harian</CardTitle>
        <CardDescription>
          Total pendapatan {formatCurrencyForTooltip(totalForPeriod)} untuk{" "}
          {getTimeRangeDescription()}
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={(value) => {
              if (value === "7d" || value === "30d" || value === "90d") {
                setTimeRange(value);
              }
            }}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">3 Bulan</ToggleGroupItem>
            <ToggleGroupItem value="30d">30 Hari</ToggleGroupItem>
            <ToggleGroupItem value="7d">7 Hari</ToggleGroupItem>
          </ToggleGroup>
          <Select
            value={timeRange}
            onValueChange={(value: "7d" | "30d" | "90d") => setTimeRange(value)}
          >
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select time range"
            >
              <SelectValue placeholder="Pilih rentang waktu" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                3 Bulan
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                30 Hari
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                7 Hari
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {isLoading ? (
          <div className="flex justify-center items-center h-[250px]">
            Memuat data...
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full"
          >
            <AreaChart
              data={chartData}
              margin={{ left: 12, right: 12, top: 5, bottom: 0 }}
            >
              <defs>
                <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-revenue, hsl(var(--chart-1)))" // Fallback color
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-revenue, hsl(var(--chart-1)))" // Fallback color
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={isMobileHook ? 20 : 10} // Adjust for mobile
                tickFormatter={(value) => {
                  const date = new Date(value + "T00:00:00"); // Ensure date is parsed as local
                  return date.toLocaleDateString("id-ID", {
                    month: "short",
                    day: "numeric",
                  });
                }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={formatCurrencyForAxis}
                width={isMobileHook ? 40 : 60} // Adjust width for Y-axis labels
              />
              <ShadcnChartTooltip // Using the renamed ShadcnChartTooltip
                cursor={true} // Enable cursor line
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) =>
                      new Date(value + "T00:00:00").toLocaleDateString(
                        "id-ID",
                        {
                          // Ensure date is parsed as local
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )
                    }
                    formatter={(value, name, props) => {
                      // 'name' will be 'revenue'
                      // 'props.payload.date' can give the date for this point if needed
                      return [
                        formatCurrencyForTooltip(value as number),
                        chartConfig[name as keyof typeof chartConfig]?.label ||
                          name,
                      ];
                    }}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="revenue"
                type="monotone" // "natural" or "monotone"
                fill="url(#fillRevenue)"
                stroke="var(--color-revenue, hsl(var(--chart-1)))"
                strokeWidth={2}
                dot={false} // Show dots on data points if desired
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
