"use client";

import * as React from "react";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconDotsVertical,
  IconLayoutColumns,
  IconTrendingUp,
  IconTrendingDown,
} from "@tabler/icons-react";
import {
  ColumnDef,
  ColumnFiltersState,
  Row,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { z } from "zod";

import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { deleteItemAction } from "@/lib/actions/item.actions";
import { Skeleton } from "@/components/ui/skeleton"; // Ditambahkan untuk loading state

// Skema data baru berdasarkan tabel Item, Kategori, Supplier, dan TransaksiPenjualan
export const itemSchema = z.object({
  id: z.number(), // ItemId
  namaProduk: z.string(), // Item.nama
  category: z.string(), // Kategori.nama
  manufacture: z.string().nullable(), // Item.manufacture
  terjual: z.number(), // Agregasi dari DetailTransaksiPenjualan.jumlah (total keseluruhan)
  stok: z.number(), // Item.stok
  supplier: z.string().nullable(), // Supplier.nama
});

export type ItemData = z.infer<typeof itemSchema>;

const ActionsCell = ({ row }: { row: Row<ItemData> }) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const item = row.original;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteItemAction(item.id);
      if (result.success) {
        toast.success(result.message || "Item deleted successfully.");
      } else {
        toast.error(result.message || "Failed to delete item.");
      }
    } catch (error) {
      toast.error("An unexpected error occurred.");
      console.error("Delete action failed:", error);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
            size="icon"
          >
            <IconDotsVertical />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuItem
            variant="destructive"
            onSelect={(e) => {
              e.preventDefault();
              setShowDeleteDialog(true);
            }}
            disabled={isDeleting}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Apakah anda yakin untuk menghapusnya?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {`Tindakan ini tidak dapat dibatalkan. Tindakan ini akan menghapus item secara permanen di database "${item.namaProduk}".`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => setShowDeleteDialog(false)}
            disabled={isDeleting}
          >
            Cancel
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const columns: ColumnDef<ItemData>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "namaProduk",
    header: "Nama Produk",
    cell: ({ row }) => {
      return <TableCellViewer item={row.original} />;
    },
    enableHiding: false,
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => (
      <div className="w-32">
        <Badge variant="outline" className="text-muted-foreground px-1.5">
          {row.original.category}
        </Badge>
      </div>
    ),
  },
  {
    accessorKey: "manufacture",
    header: "Manufacture",
    cell: ({ row }) => (
      <Badge variant="outline" className="text-muted-foreground px-1.5">
        {row.original.manufacture || "N/A"}
      </Badge>
    ),
  },
  {
    accessorKey: "terjual",
    header: () => <div className="w-full text-right">Terjual (Total)</div>,
    cell: ({ row }) => (
      <div className="text-right w-16">{row.original.terjual}</div>
    ),
  },
  {
    accessorKey: "stok",
    header: () => <div className="w-full text-right">Stok</div>,
    cell: ({ row }) => (
      <div className="text-right w-16">{row.original.stok}</div>
    ),
  },
  {
    accessorKey: "supplier",
    header: "Supplier",
    cell: ({ row }) => {
      return <div className="w-38">{row.original.supplier || "N/A"}</div>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <ActionsCell row={row} />,
  },
];

function DraggableRow({ row }: { row: Row<ItemData> }) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original.id,
  });

  return (
    <TableRow
      data-state={row.getIsSelected() && "selected"}
      data-dragging={isDragging}
      ref={setNodeRef}
      className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition,
      }}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  );
}

export function DataTable({ data: initialData }: { data: ItemData[] }) {
  const [data, setData] = React.useState(() => initialData);
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const sortableId = React.useId();
  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  );

  const dataIds = React.useMemo<UniqueIdentifier[]>(
    () => data?.map(({ id }) => id) || [],
    [data]
  );

  React.useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    getRowId: (row) => row.id.toString(),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setData((currentData) => {
        const oldIndex = dataIds.indexOf(active.id);
        const newIndex = dataIds.indexOf(over.id);
        return arrayMove(currentData, oldIndex, newIndex);
      });
    }
  }

  return (
    <div className="w-full flex-col justify-start gap-6">
      <div className="flex items-center justify-end px-4 lg:px-6 py-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <IconLayoutColumns />
              <span className="hidden lg:inline ml-2">Customize Columns</span>
              <span className="lg:hidden ml-2">Columns</span>
              <IconChevronDown className="ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {table
              .getAllColumns()
              .filter(
                (column) =>
                  typeof column.accessorFn !== "undefined" &&
                  column.getCanHide()
              )
              .map((column) => {
                let columnLabel = column.id;
                if (column.id === "namaProduk") columnLabel = "Nama Produk";
                if (column.id === "category") columnLabel = "Category";
                if (column.id === "manufacture") columnLabel = "Manufacture";
                if (column.id === "terjual") columnLabel = "Terjual (Total)";
                if (column.id === "stok") columnLabel = "Stok";
                if (column.id === "supplier") columnLabel = "Supplier";
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {columnLabel}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
        <div className="overflow-hidden rounded-lg border">
          <DndContext
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
            sensors={sensors}
            id={sortableId}
          >
            <Table>
              <TableHeader className="bg-muted sticky top-0 z-10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id} colSpan={header.colSpan}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody className="**:data-[slot=table-cell]:first:w-8">
                {table.getRowModel().rows?.length ? (
                  <SortableContext
                    items={dataIds}
                    strategy={verticalListSortingStrategy}
                  >
                    {table.getRowModel().rows.map((row) => (
                      <DraggableRow key={row.id} row={row} />
                    ))}
                  </SortableContext>
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </DndContext>
        </div>
        <div className="flex items-center justify-between px-4 py-4">
          <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} row(s) selected.
          </div>
          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="hidden items-center gap-2 lg:flex">
              <Label htmlFor="rows-per-page" className="text-sm font-medium">
                Rows per page
              </Label>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => {
                  table.setPageSize(Number(value));
                }}
              >
                <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                  <SelectValue
                    placeholder={table.getState().pagination.pageSize}
                  />
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
            <div className="flex w-fit items-center justify-center text-sm font-medium">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </div>
            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to first page</span>
                <IconChevronsLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to previous page</span>
                <IconChevronLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to next page</span>
                <IconChevronRight />
              </Button>
              <Button
                variant="outline"
                className="hidden size-8 lg:flex"
                size="icon"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to last page</span>
                <IconChevronsRight />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type ChartPeriod = "daily" | "weekly" | "monthly";
type SalesChartDataPoint = { periodLabel: string; sales: number }; // Tipe data untuk chart

const salesChartConfig = {
  sales: {
    label: "Penjualan",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

function TableCellViewer({ item }: { item: ItemData }) {
  const isMobile = useIsMobile();
  const [chartPeriod, setChartPeriod] = React.useState<ChartPeriod>("monthly");
  const [detailedSalesData, setDetailedSalesData] = React.useState<
    SalesChartDataPoint[]
  >([]);
  const [isLoadingChart, setIsLoadingChart] = React.useState(false);
  const [chartError, setChartError] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Jika item.terjual adalah 0 (berdasarkan data total dari tabel), tidak perlu fetch detail
    if (item.terjual === 0) {
      setDetailedSalesData([]);
      setIsLoadingChart(false);
      setChartError(null);
      return;
    }

    const fetchChartData = async () => {
      setIsLoadingChart(true);
      setChartError(null);
      try {
        // Panggil API endpoint Anda di sini
        const response = await fetch(
          `/api/produk/${item.id}/penjualan?periode=${chartPeriod}`
        );
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            message: `Gagal mengambil data: ${response.statusText}`,
          }));
          throw new Error(
            errorData.message || `Gagal mengambil data: ${response.statusText}`
          );
        }
        const data: SalesChartDataPoint[] = await response.json();
        setDetailedSalesData(data);
      } catch (error) {
        console.error("Error fetching chart data:", error);
        setChartError(
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat mengambil data chart."
        );
        setDetailedSalesData([]); // Kosongkan data jika ada error
      } finally {
        setIsLoadingChart(false);
      }
    };

    fetchChartData();
  }, [item.id, item.terjual, chartPeriod]); // Tambahkan item.terjual sebagai dependency

  const { trendPercentage, isTrendingUp, totalSalesForPeriod } =
    React.useMemo(() => {
      if (
        item.terjual === 0 ||
        isLoadingChart ||
        chartError ||
        !detailedSalesData ||
        detailedSalesData.length === 0
      ) {
        return {
          trendPercentage: 0,
          isTrendingUp: false,
          totalSalesForPeriod: 0,
        };
      }

      // Jika hanya ada satu titik data, tidak ada tren yang bisa dihitung
      if (detailedSalesData.length < 2) {
        const currentTotal = detailedSalesData.reduce(
          (sum, data) => sum + data.sales,
          0
        );
        return {
          trendPercentage: 0,
          isTrendingUp: currentTotal > 0,
          totalSalesForPeriod: currentTotal,
        };
      }

      const lastSale = detailedSalesData[detailedSalesData.length - 1].sales;
      const secondLastSale =
        detailedSalesData[detailedSalesData.length - 2].sales;
      const totalForPeriod = detailedSalesData.reduce(
        (sum, data) => sum + data.sales,
        0
      );

      if (secondLastSale === 0) {
        return {
          trendPercentage: lastSale > 0 ? 100 : 0,
          isTrendingUp: lastSale > 0,
          totalSalesForPeriod: totalForPeriod,
        };
      }

      const percentage = ((lastSale - secondLastSale) / secondLastSale) * 100;
      return {
        trendPercentage: parseFloat(percentage.toFixed(1)),
        isTrendingUp: percentage >= 0,
        totalSalesForPeriod: totalForPeriod,
      };
    }, [detailedSalesData, item.terjual, isLoadingChart, chartError]);

  const periodTextMap: Record<ChartPeriod, string> = {
    daily: "harian",
    weekly: "mingguan",
    monthly: "bulanan",
  };
  const selectedPeriodTextSingular = periodTextMap[chartPeriod];
  const selectedPeriodTextPlural =
    chartPeriod === "daily"
      ? "hari terakhir"
      : chartPeriod === "weekly"
      ? "minggu terakhir"
      : "bulan terakhir";

  let salesQualityText = "";
  if (item.terjual === 0) {
    salesQualityText = `Produk ini belum pernah terjual.`;
  } else if (isLoadingChart) {
    salesQualityText = `Memuat statistik penjualan...`;
  } else if (chartError) {
    salesQualityText = `Gagal memuat statistik.`;
  } else if (detailedSalesData.length === 0) {
    salesQualityText = `Tidak ada data penjualan untuk periode ${selectedPeriodTextSingular} ini.`;
  } else if (totalSalesForPeriod === 0) {
    salesQualityText = `Produk ini tidak ada penjualan selama periode ${selectedPeriodTextSingular} ini.`;
  } else if (isTrendingUp) {
    salesQualityText = `Produk ini memiliki penjualan dan trennya meningkat selama periode ${selectedPeriodTextSingular} ini.`;
  } else {
    salesQualityText = `Produk ini mengalami penurunan penjualan selama periode ${selectedPeriodTextSingular} ini.`;
  }

  return (
    <Drawer direction={isMobile ? "bottom" : "right"}>
      <DrawerTrigger asChild>
        <Button variant="link" className="text-foreground w-fit px-0 text-left">
          {item.namaProduk}
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[100vh] flex flex-col">
        <DrawerHeader className="gap-1 flex-shrink-0">
          <DrawerTitle>{item.namaProduk}</DrawerTitle>
          <DrawerDescription>
            Detail Produk dan Statistik Penjualan.
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm flex-grow">
          {!isMobile && (
            <>
              <div className="flex gap-2 mb-2">
                {(["daily", "weekly", "monthly"] as ChartPeriod[]).map(
                  (period) => (
                    <Button
                      key={period}
                      variant={chartPeriod === period ? "default" : "outline"}
                      size="sm"
                      onClick={() => setChartPeriod(period)}
                      disabled={isLoadingChart}
                    >
                      {period.charAt(0).toUpperCase() + period.slice(1)}
                    </Button>
                  )
                )}
              </div>

              {isLoadingChart ? (
                <div className="flex flex-col space-y-3 py-8 min-h-[200px] justify-center items-center">
                  <Skeleton className="h-24 w-full rounded-xl" />
                  <div className="space-y-2 w-full">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              ) : chartError ? (
                <div className="text-center text-red-500 py-8 min-h-[200px] flex justify-center items-center">
                  Error: {chartError}
                </div>
              ) : item.terjual === 0 ? (
                <div className="text-center text-muted-foreground py-8 min-h-[200px] flex justify-center items-center">
                  Produk ini belum memiliki riwayat penjualan.
                </div>
              ) : detailedSalesData.length > 0 ? (
                <ChartContainer
                  config={salesChartConfig}
                  className="min-h-[200px] w-full"
                >
                  <AreaChart
                    accessibilityLayer
                    data={detailedSalesData} // Gunakan detailedSalesData
                    margin={{ left: -5, right: 10, top: 10, bottom: 0 }}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="periodLabel"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      width={35} // Sesuaikan jika perlu
                      allowDecimals={false} // Tidak mengizinkan desimal di sumbu Y
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent indicator="dot" />}
                    />
                    <Area
                      dataKey="sales"
                      type="natural"
                      fill="var(--color-sales)"
                      fillOpacity={0.4}
                      stroke="var(--color-sales)"
                    />
                  </AreaChart>
                </ChartContainer>
              ) : (
                <div className="text-center text-muted-foreground py-8 min-h-[200px] flex justify-center items-center">
                  Data penjualan untuk periode {chartPeriod} ini tidak tersedia.
                </div>
              )}
              <Separator />
              <div className="grid gap-2">
                <div className="flex gap-2 leading-none font-medium items-center">
                  {isLoadingChart ? (
                    <Skeleton className="h-4 w-3/5" />
                  ) : chartError ? (
                    <span className="text-red-500">
                      Data tren tidak tersedia
                    </span>
                  ) : item.terjual === 0 ? (
                    <span className="text-muted-foreground">
                      Belum ada data tren.
                    </span>
                  ) : detailedSalesData.length > 0 &&
                    (totalSalesForPeriod > 0 || trendPercentage !== 0) ? (
                    <>
                      {isTrendingUp && totalSalesForPeriod > 0 ? ( // Hanya tampilkan ikon jika ada penjualan
                        <IconTrendingUp className="size-4 text-green-500" />
                      ) : !isTrendingUp && totalSalesForPeriod > 0 ? (
                        <IconTrendingDown className="size-4 text-red-500" />
                      ) : (
                        <IconTrendingUp className="size-4 text-muted-foreground" /> // Default jika tidak ada perubahan atau tidak ada penjualan di periode ini
                      )}
                      <span>
                        {totalSalesForPeriod === 0
                          ? "Tidak ada penjualan periode ini"
                          : trendPercentage === 0 && totalSalesForPeriod > 0
                          ? `Stabil dibandingkan periode sebelumnya`
                          : `${
                              isTrendingUp ? "Trending Naik" : "Trending Turun"
                            } ${Math.abs(trendPercentage)}%`}
                        {chartPeriod === "daily" && " hari ini"}
                        {chartPeriod === "weekly" && " minggu ini"}
                        {chartPeriod === "monthly" && " bulan ini"}
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">
                      {detailedSalesData.length > 0
                        ? "Tidak ada perubahan tren signifikan."
                        : "Tidak ada data penjualan untuk periode ini."}
                    </span>
                  )}
                </div>
                <div className="text-muted-foreground">
                  {item.terjual === 0 ? (
                    "Statistik kualitas produk akan tersedia setelah ada penjualan."
                  ) : isLoadingChart ? (
                    <Skeleton className="h-4 w-full" />
                  ) : chartError ? (
                    "Tidak dapat menampilkan ringkasan kualitas."
                  ) : (
                    `Menampilkan total penjualan ${totalSalesForPeriod} unit selama ${selectedPeriodTextPlural}. ${salesQualityText}`
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}
          <form className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 cursor-none">
              <Label htmlFor={`namaProduk-${item.id}`}>Nama Produk</Label>
              <Input
                id={`namaProduk-${item.id}`}
                defaultValue={item.namaProduk}
                readOnly
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-3 cursor-none">
                <Label htmlFor={`category-${item.id}`}>Category</Label>
                <Input
                  id={`category-${item.id}`}
                  defaultValue={item.category}
                  readOnly
                />
              </div>
              <div className="flex flex-col gap-3 cursore-none">
                <Label htmlFor={`manufacture-${item.id}`}>Manufacture</Label>
                <Input
                  id={`manufacture-${item.id}`}
                  defaultValue={item.manufacture ?? ""}
                  readOnly
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-3 cursor-none">
                <Label htmlFor={`terjual-${item.id}`}>Terjual (Total)</Label>
                <Input
                  id={`terjual-${item.id}`}
                  defaultValue={item.terjual.toString()}
                  type="number"
                  readOnly
                />
              </div>
              <div className="flex flex-col gap-3 cursor-none">
                <Label htmlFor={`stok-${item.id}`}>Stok</Label>
                <Input
                  id={`stok-${item.id}`}
                  defaultValue={item.stok.toString()}
                  type="number"
                  readOnly
                />
              </div>
            </div>
            <div className="flex flex-col gap-3 mb-5 cursor-none">
              <Label htmlFor={`supplier-${item.id}`}>Supplier</Label>
              <Input
                id={`supplier-${item.id}`}
                defaultValue={item.supplier ?? ""}
                readOnly
              />
            </div>
          </form>
        </div>
        {/* DrawerFooter dihilangkan sesuai permintaan */}
      </DrawerContent>
    </Drawer>
  );
}
