"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  PlusCircle,
  FileDown,
  FileUp,
  Search,
  Pencil,
  Trash,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BarcodeGenerator,
  generateRandomBarcode,
} from "@/components/barcode-generator";
import { AddItemDialog } from "@/components/add-item-dialog";
import { ImportExportDialog } from "@/components/import-export-dialog";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import {
  getItems,
  getKategori,
  getSupplier,
  deleteItemAction,
} from "@/lib/actions/item.actions";

interface Item {
  id: number;
  nama: string;
  kategori?: { id: number; nama: string };
  supplier?: { id: number; nama: string };
  hargaJual: number;
  hargaBeli?: number;
  stok: number;
  stokMinimum?: number;
  kodeBarcode?: string;
  satuan?: string;
}

const generateBarcodeForItem = (item: Item) => {
  if (!item.kodeBarcode) {
    return generateRandomBarcode();
  }
  return item.kodeBarcode;
};

interface KategoriData {
  data?: Array<{ id: number; nama: string }>;
}

interface SupplierData {
  data?: Array<{ id: number; nama: string }>;
}

interface ItemsData {
  data?: Array<Item>;
}

export default function InventoryItemsPage() {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [selectedKategori, setSelectedKategori] = React.useState("all");
  const [selectedSupplier, setSelectedSupplier] = React.useState("all");
  const [selectedStockStatus, setSelectedStockStatus] = React.useState("all");
  const [itemToDelete, setItemToDelete] = React.useState<number | null>(null);

  // Fetch data items
  const { data: itemsData, isLoading: isLoadingItems } = useQuery<ItemsData>({
    queryKey: [
      "items",
      search,
      selectedKategori,
      selectedSupplier,
      selectedStockStatus,
    ],
    queryFn: () =>
      getItems({
        search,
        kategoriId:
          selectedKategori !== "all" ? Number(selectedKategori) : undefined,
        supplierId:
          selectedSupplier !== "all" ? Number(selectedSupplier) : undefined,
        statusStok: selectedStockStatus as "all" | "low" | "out" | "normal",
      }),
  });

  // Fetch kategori
  const { data: kategoriData } = useQuery<KategoriData>({
    queryKey: ["kategori"],
    queryFn: getKategori,
  });

  // Fetch supplier
  const { data: supplierData } = useQuery<SupplierData>({
    queryKey: ["supplier"],
    queryFn: getSupplier,
  });

  // Handle delete item
  const handleDeleteItem = async () => {
    if (!itemToDelete) return;

    try {
      const result = await deleteItemAction(itemToDelete);
      if (result.success) {
        toast.success("Item berhasil dihapus");
        setItemToDelete(null);
      } else {
        toast.error(result.error || "Gagal menghapus item");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan saat menghapus item");
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Daftar Barang Inventaris
          </h1>
          <p className="text-muted-foreground">
            Kelola semua barang dalam inventaris toko Anda.
          </p>
        </div>

        {/* Tombol Aksi Utama */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <AddItemDialog
            kategoriData={kategoriData?.data}
            supplierData={supplierData?.data}
            onSuccess={() => {
              // Refresh data setelah menambah item baru
              router.refresh();
            }}
          />
          <ImportExportDialog
            type="import"
            onSuccess={() => {
              // Refresh data setelah import
              router.refresh();
            }}
          />
          <ImportExportDialog type="export" />
        </div>
      </div>

      {/* Area Pencarian dan Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari barang..."
            className="pl-8 w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2 sm:gap-4 w-full sm:w-auto">
          <Select value={selectedKategori} onValueChange={setSelectedKategori}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kategori</SelectItem>
              {kategoriData?.data?.map((kategori) => (
                <SelectItem key={kategori.id} value={String(kategori.id)}>
                  {kategori.nama}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Supplier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Supplier</SelectItem>
              {supplierData?.data?.map((supplier) => (
                <SelectItem key={supplier.id} value={String(supplier.id)}>
                  {supplier.nama}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedStockStatus}
            onValueChange={setSelectedStockStatus}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Status Stok" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="low">Stok Menipis</SelectItem>
              <SelectItem value="out">Stok Habis</SelectItem>
              <SelectItem value="normal">Stok Normal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabel Data Barang */}
      <div className="rounded-md border overflow-x-auto pb-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px] whitespace-nowrap">No.</TableHead>
              <TableHead className="whitespace-nowrap">Barcode</TableHead>
              <TableHead className="whitespace-nowrap">Nama Barang</TableHead>
              <TableHead className="whitespace-nowrap">Kategori</TableHead>
              <TableHead className="whitespace-nowrap">Satuan</TableHead>
              <TableHead className="text-right whitespace-nowrap">
                Harga Beli
              </TableHead>
              <TableHead className="text-right whitespace-nowrap">
                Harga Jual
              </TableHead>
              <TableHead className="text-right whitespace-nowrap">
                Stok
              </TableHead>
              <TableHead className="text-right whitespace-nowrap">
                Stok Min
              </TableHead>
              <TableHead className="whitespace-nowrap">Supplier</TableHead>
              <TableHead className="text-right whitespace-nowrap">
                Aksi
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Loading State */}
            {isLoadingItems && (
              <TableRow>
                <TableCell colSpan={11}>
                  <div className="flex items-center justify-center py-4">
                    <Skeleton className="h-4 w-[250px]" />
                  </div>
                </TableCell>
              </TableRow>
            )}

            {/* Empty State */}
            {!isLoadingItems &&
              (!itemsData?.data || itemsData.data.length === 0) && (
                <TableRow>
                  <TableCell colSpan={11}>
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <p className="text-lg font-medium">Belum ada barang</p>
                      <p className="text-sm text-muted-foreground">
                        Mulai tambahkan barang ke inventaris Anda.
                      </p>
                      <Button
                        onClick={() => router.push("/inventory/items/new")}
                        className="mt-4"
                      >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Tambah Barang
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}

            {/* Data State */}
            {!isLoadingItems &&
              itemsData?.data?.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-start gap-2">
                      <BarcodeGenerator
                        value={generateBarcodeForItem(item)}
                        width={1.5}
                        height={30}
                      />
                      <span className="text-xs text-muted-foreground">
                        {item.kodeBarcode || "-"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{item.nama}</TableCell>
                  <TableCell>{item.kategori?.nama || "-"}</TableCell>
                  <TableCell>{item.satuan || "Pcs"}</TableCell>
                  <TableCell className="text-right">
                    {item.hargaBeli
                      ? new Intl.NumberFormat("id-ID", {
                          style: "currency",
                          currency: "IDR",
                        }).format(Number(item.hargaBeli))
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {new Intl.NumberFormat("id-ID", {
                      style: "currency",
                      currency: "IDR",
                    }).format(Number(item.hargaJual))}
                  </TableCell>
                  <TableCell className="text-right">{item.stok}</TableCell>
                  <TableCell className="text-right">
                    {item.stokMinimum || 0}
                  </TableCell>
                  <TableCell>{item.supplier?.nama || "-"}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          router.push(`/inventory/items/${item.id}/edit`)
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog
                        open={itemToDelete === item.id}
                        onOpenChange={(open) =>
                          setItemToDelete(open ? item.id : null)
                        }
                      >
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Apakah anda yakin untuk menghapusnya?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Tindakan ini tidak dapat dibatalkan. Tindakan ini
                              akan menghapus item secara permanen dari database.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel
                              onClick={() => setItemToDelete(null)}
                            >
                              Batal
                            </AlertDialogCancel>
                            <Button
                              variant="destructive"
                              onClick={handleDeleteItem}
                            >
                              Hapus
                            </Button>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
