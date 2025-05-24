"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FilePlus2, Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { id } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";

import { toast } from "sonner";

const jenisPenyesuaianOptions = [
  { value: "Stok Opname", label: "Stok Opname (Penghitungan Fisik)" },
  { value: "Barang Masuk (Lain-lain)", label: "Barang Masuk (Lain-lain)" },
  { value: "Barang Keluar (Lain-lain)", label: "Barang Keluar (Lain-lain)" },
  { value: "Barang Rusak", label: "Barang Rusak" },
  { value: "Barang Hilang", label: "Barang Hilang" },
  { value: "Barang Ditemukan", label: "Barang Ditemukan" },
  { value: "Retur Jual (Manual)", label: "Retur Jual (Manual)" },
  { value: "Retur Beli (Manual)", label: "Retur Beli (Manual)" },
];

export default function StockAdjustmentsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [itemSearchQuery, setItemSearchQuery] = useState(""); // Add new state for item search
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });
  const [selectedJenisPenyesuaian, setSelectedJenisPenyesuaian] =
    useState("all");

  const form = useForm({
    defaultValues: {
      itemId: "",
      tanggal: new Date(),
      nomorReferensi: "",
      jenisPenyesuaian: "",
      tipeOperasi: "Tambah",
      jumlah: 0,
      stokFisikBaru: 0,
      keterangan: "",
    },
  });

  // Update useQuery to use object format for v5
  const { data: items = [], isLoading: isLoadingItems } = useQuery<Item[]>({
    queryKey: ["items"], // queryKey in object
    queryFn: async () => {
      // queryFn in object
      const response = await fetch(`/api/items/all`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch items");
      }
      // Assuming the API now returns an object with an 'items' key
      const data = await response.json();
      return Array.isArray(data.items) ? data.items : []; // Ensure data.items is an array
    },
  });

  // Update useQuery to use object format for v5
  const { data: adjustments, isLoading } = useQuery({
    queryKey: [
      "stock-adjustments",
      dateRange,
      selectedJenisPenyesuaian,
      searchQuery,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
        searchQuery,
        ...(selectedJenisPenyesuaian !== "all" && {
          jenisPenyesuaian: selectedJenisPenyesuaian,
        }),
      });

      const response = await fetch(
        `/api/inventory/stock-adjustments?${params}`,
        {
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );
      if (!response.ok) throw new Error("Failed to fetch adjustments");
      const data = await response.json();
      return data;
    },
  });

  const onSubmit = async (values) => {
    try {
      const response = await fetch("/api/inventory/stock-adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...values,
          selectedItem,
        }), // Pass selectedItem to get current stock
      });

      if (!response.ok) throw new Error("Failed to save adjustment");

      toast.success("Penyesuaian stok berhasil disimpan");

      setIsDialogOpen(false);
      form.reset();
    } catch (error) {
      toast.error("Gagal menyimpan penyesuaian stok", {
        description: error.message,
      });
    }
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Penyesuaian Stok Inventaris"
        description="Kelola penyesuaian stok barang"
      />

      <div className="flex justify-between items-center flex-col md:flex-row gap-4">
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <DatePickerWithRange value={dateRange} onChange={setDateRange} />
          <Input
            placeholder="Cari barang..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-[300px]"
          />
          <Select
            value={selectedJenisPenyesuaian}
            onValueChange={setSelectedJenisPenyesuaian}
          >
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Jenis Penyesuaian" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              {jenisPenyesuaianOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={() => setIsDialogOpen(true)}
          className="w-full md:w-auto"
        >
          <FilePlus2 className="mr-2 h-4 w-4" />
          Buat Penyesuaian Baru
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">No</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>No Referensi</TableHead>
              <TableHead>Nama Barang</TableHead>
              <TableHead>Jenis Penyesuaian</TableHead>
              <TableHead>Operasi</TableHead>
              <TableHead>Jumlah</TableHead>
              <TableHead>Stok Sebelum</TableHead>
              <TableHead>Stok Sesudah</TableHead>
              <TableHead>Keterangan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center">
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : adjustments?.data?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center">
                  Tidak ada data
                </TableCell>
              </TableRow>
            ) : (
              adjustments?.data?.map((row, index) => (
                <TableRow key={row.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    {format(new Date(row.tanggal), "dd MMM yyyy", {
                      locale: id,
                    })}
                  </TableCell>
                  <TableCell>{row.nomorReferensi || "-"}</TableCell>
                  <TableCell>{row.item.nama}</TableCell>
                  <TableCell>{row.jenisPenyesuaian}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                        row.tipeOperasi === "Tambah"
                          ? "bg-green-50 text-green-700 ring-green-600/20"
                          : "bg-red-50 text-red-700 ring-red-600/20"
                      }`}
                    >
                      {row.tipeOperasi}
                    </span>
                  </TableCell>
                  <TableCell>{row.jumlah}</TableCell>
                  <TableCell>{row.stokSebelum}</TableCell>
                  <TableCell>{row.stokSesudah}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {row.keterangan || "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Formulir Penyesuaian Stok Baru</DialogTitle>
            <DialogDescription>
              Isi detail penyesuaian stok di bawah ini
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="itemId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pilih Barang</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between"
                          >
                            {field.value
                              ? items?.find((item) => item.id === field.value)
                                  ?.nama
                              : "Pilih barang..."}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                        {Array.isArray(items) && ( // Only render Command if items is an array
                          <Command>
                            <CommandInput
                              placeholder="Cari barang..."
                              className="h-9"
                            />
                            <CommandEmpty>Barang tidak ditemukan</CommandEmpty>
                            <CommandGroup className="max-h-[300px] overflow-y-auto">
                              {/* Let Command handle filtering */}
                              {items.map((item) => (
                                <CommandItem
                                  key={item.id}
                                  value={item.nama} // Command uses this value for filtering
                                  onSelect={() => {
                                    form.setValue("itemId", item.id);
                                    setSelectedItem(item);
                                  }}
                                >
                                  {item.nama}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        )}
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tanggal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tanggal Penyesuaian</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: id })
                            ) : (
                              <span>Pilih tanggal</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nomorReferensi"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nomor Referensi (Opsional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="jenisPenyesuaian"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jenis Penyesuaian</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih jenis penyesuaian" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {jenisPenyesuaianOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedItem && (
                <div className="rounded-lg border p-3 text-sm">
                  <p>Stok Saat Ini: {selectedItem.stok}</p>
                </div>
              )}

              {form.watch("jenisPenyesuaian") === "Stok Opname" ? (
                <FormField
                  control={form.control}
                  name="stokFisikBaru"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stok Fisik Baru</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value, 10))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <>
                  <FormField
                    control={form.control}
                    name="tipeOperasi"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Tipe Operasi</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex space-x-4"
                          >
                            <FormItem className="flex items-center space-x-2">
                              <FormControl>
                                <RadioGroupItem value="Tambah" />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Tambah Stok
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2">
                              <FormControl>
                                <RadioGroupItem value="Kurang" />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Kurang Stok
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="jumlah"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jumlah</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value, 10))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <FormField
                control={form.control}
                name="keterangan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Keterangan</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit">Simpan Penyesuaian</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
