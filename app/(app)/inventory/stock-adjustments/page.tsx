"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { CalendarIcon, FilePlus2, Search, X } from "lucide-react";
import { toast } from "sonner";

import {
  createStockAdjustmentAction,
  getStockAdjustmentsAction,
} from "@/lib/actions/stock-adjustment.actions";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
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
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Schema untuk form penyesuaian stok
const stockAdjustmentSchema = z.object({
  itemId: z.number({
    required_error: "Silakan pilih barang",
  }),
  tanggal: z.date({
    required_error: "Silakan pilih tanggal penyesuaian",
  }),
  nomorReferensi: z.string().optional(),
  jenisPenyesuaian: z.string({
    required_error: "Silakan pilih jenis penyesuaian",
  }),
  tipeOperasi: z
    .enum(["Tambah", "Kurang"], {
      required_error: "Silakan pilih tipe operasi",
    })
    .optional(),
  jumlah: z
    .number({
      required_error: "Silakan masukkan jumlah",
    })
    .min(1, "Jumlah minimal 1"),
  stokFisikBaru: z.number().optional(),
  keterangan: z.string().optional(),
});

type StockAdjustmentFormValues = z.infer<typeof stockAdjustmentSchema>;

// Jenis penyesuaian stok
const jenisAdjustmentOptions = [
  { value: "Stok Opname", label: "Stok Opname (Penghitungan Fisik)" },
  { value: "Barang Masuk", label: "Barang Masuk (Lain-lain)" },
  { value: "Barang Keluar", label: "Barang Keluar (Lain-lain)" },
  { value: "Barang Rusak", label: "Barang Rusak" },
  { value: "Barang Hilang", label: "Barang Hilang" },
  { value: "Barang Ditemukan", label: "Barang Ditemukan" },
  { value: "Retur Jual", label: "Retur Jual (Manual)" },
  { value: "Retur Beli", label: "Retur Beli (Manual)" },
];

// Dummy data untuk contoh
const dummyItems = [
  { id: 1, nama: "Paku 2 Inch", kodeBarcode: "PKU001", stok: 100 },
  { id: 2, nama: "Cat Tembok 5kg", kodeBarcode: "CT001", stok: 50 },
  { id: 3, nama: "Semen 50kg", kodeBarcode: "SMN001", stok: 30 },
];

const dummyAdjustmentHistory = [
  {
    id: 1,
    tanggal: new Date("2023-06-01"),
    nomorReferensi: "ADJ001",
    namaBarang: "Paku 2 Inch",
    jenisPenyesuaian: "Stok Opname",
    tipeOperasi: "Tambah",
    jumlah: 10,
    stokSebelum: 90,
    stokSesudah: 100,
    userPembuat: "Admin",
    keterangan: "Penyesuaian setelah penghitungan fisik",
  },
  {
    id: 2,
    tanggal: new Date("2023-06-02"),
    nomorReferensi: "ADJ002",
    namaBarang: "Cat Tembok 5kg",
    jenisPenyesuaian: "Barang Rusak",
    tipeOperasi: "Kurang",
    jumlah: 5,
    stokSebelum: 55,
    stokSesudah: 50,
    userPembuat: "Admin",
    keterangan: "Barang rusak karena terjatuh",
  },
];

export default function StockAdjustmentsPage() {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [calculatedStock, setCalculatedStock] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [filterData, setFilterData] = useState({
    searchQuery: "",
    startDate: "",
    endDate: "",
    jenisPenyesuaian: "",
    page: 1,
    limit: 10,
  });
  const [pagination, setPagination] = useState({
    totalCount: 0,
    totalPages: 0,
    currentPage: 1,
  });

  // Form untuk penyesuaian stok
  const form = useForm<StockAdjustmentFormValues>({
    resolver: zodResolver(stockAdjustmentSchema),
    defaultValues: {
      tanggal: new Date(),
      nomorReferensi: "",
      keterangan: "",
    },
  });

  // Fungsi untuk mengambil data penyesuaian stok
  const fetchAdjustments = async () => {
    try {
      setIsLoading(true);
      const result = await getStockAdjustmentsAction({
        page: filterData.page,
        limit: filterData.limit,
        searchQuery: filterData.searchQuery,
        startDate: filterData.startDate
          ? new Date(filterData.startDate)
          : undefined,
        endDate: filterData.endDate ? new Date(filterData.endDate) : undefined,
        jenisPenyesuaian: filterData.jenisPenyesuaian || undefined,
      });

      if (result.success) {
        setAdjustments(result.data);
        setPagination({
          totalCount: result.meta.totalCount,
          totalPages: result.meta.totalPages,
          currentPage: result.meta.page,
        });
      } else {
        toast.error(
          result.message ||
            "Terjadi kesalahan saat mengambil data penyesuaian stok."
        );
      }
    } catch (error) {
      console.error("Error fetching adjustments:", error);
      toast.error("Terjadi kesalahan saat mengambil data penyesuaian stok.");
    } finally {
      setIsLoading(false);
    }
  };

  // Ambil data saat komponen dimount atau filter berubah
  useEffect(() => {
    fetchAdjustments();
  }, [filterData.page, filterData.limit]);

  // Handler untuk menerapkan filter
  const handleApplyFilter = () => {
    setFilterData((prev) => ({ ...prev, page: 1 })); // Reset ke halaman pertama
    fetchAdjustments();
  };

  // Handler untuk reset filter
  const handleResetFilter = () => {
    setFilterData({
      searchQuery: "",
      startDate: "",
      endDate: "",
      jenisPenyesuaian: "",
      page: 1,
      limit: 10,
    });
    fetchAdjustments();
  };

  // Handler untuk navigasi halaman
  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= pagination.totalPages) {
      setFilterData((prev) => ({ ...prev, page: newPage }));
    }
  };

  const watchJenisPenyesuaian = form.watch("jenisPenyesuaian");
  const watchTipeOperasi = form.watch("tipeOperasi");
  const watchJumlah = form.watch("jumlah");
  const watchStokFisikBaru = form.watch("stokFisikBaru");

  // Fungsi untuk menghitung stok setelah penyesuaian
  const calculateNewStock = () => {
    if (!selectedItem) return null;

    const currentStock = selectedItem.stok;

    if (
      watchJenisPenyesuaian === "Stok Opname" &&
      watchStokFisikBaru !== undefined
    ) {
      return watchStokFisikBaru;
    } else if (watchTipeOperasi && watchJumlah) {
      if (watchTipeOperasi === "Tambah") {
        return currentStock + watchJumlah;
      } else if (watchTipeOperasi === "Kurang") {
        return Math.max(0, currentStock - watchJumlah);
      }
    }

    return currentStock;
  };

  // Efek untuk menghitung stok baru saat nilai form berubah
  const updateCalculatedStock = () => {
    setCalculatedStock(calculateNewStock());
  };

  // Handler untuk memilih item
  const handleSelectItem = (item: any) => {
    setSelectedItem(item);
    form.setValue("itemId", item.id);
    updateCalculatedStock();
  };

  // Handler untuk submit form
  const onSubmit = async (data: StockAdjustmentFormValues) => {
    try {
      // Siapkan data untuk server action
      const adjustmentData = {
        ...data,
        userId: 1, // Ganti dengan ID user yang sebenarnya dari auth
        // Jika jenis penyesuaian adalah Stok Opname, hitung tipe operasi dan jumlah
        ...(data.jenisPenyesuaian === "Stok Opname" && {
          tipeOperasi:
            data.stokFisikBaru! > selectedItem!.stok ? "Tambah" : "Kurang",
          jumlah: Math.abs(data.stokFisikBaru! - selectedItem!.stok),
        }),
      };

      // Panggil server action
      const result = await createStockAdjustmentAction(adjustmentData);

      if (result.success) {
        // Tampilkan toast sukses
        toast.success(
          `Stok ${selectedItem?.nama} telah disesuaikan dari ${selectedItem?.stok} menjadi ${calculatedStock}`
        );

        // Reset form dan tutup dialog
        form.reset();
        setSelectedItem(null);
        setCalculatedStock(null);
        setOpen(false);
      } else {
        // Tampilkan pesan error dari server
        toast.error(result.message || "Terjadi kesalahan saat menyimpan data.");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Terjadi kesalahan saat menyimpan data. Silakan coba lagi.");
    }
  };

  // Filter untuk riwayat penyesuaian stok
  const filteredHistory = dummyAdjustmentHistory.filter((item) =>
    item.namaBarang.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">
          Penyesuaian Stok Inventaris
        </h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <FilePlus2 className="mr-2 h-4 w-4" />
              Buat Penyesuaian Baru
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Formulir Penyesuaian Stok Baru</DialogTitle>
              <DialogDescription>
                Isi detail penyesuaian stok di bawah ini.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                {/* Pilih Barang */}
                <div className="space-y-2">
                  <Label htmlFor="item-search">Pilih Barang</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="item-search"
                      placeholder="Cari barang berdasarkan nama atau kode"
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  {searchTerm && (
                    <div className="border rounded-md mt-1 max-h-[200px] overflow-y-auto">
                      {dummyItems
                        .filter(
                          (item) =>
                            item.nama
                              .toLowerCase()
                              .includes(searchTerm.toLowerCase()) ||
                            item.kodeBarcode
                              .toLowerCase()
                              .includes(searchTerm.toLowerCase())
                        )
                        .map((item) => (
                          <div
                            key={item.id}
                            className="p-2 hover:bg-muted cursor-pointer"
                            onClick={() => {
                              handleSelectItem(item);
                              setSearchTerm("");
                            }}
                          >
                            <div className="font-medium">{item.nama}</div>
                            <div className="text-sm text-muted-foreground">
                              Kode: {item.kodeBarcode} | Stok: {item.stok}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                  {selectedItem && (
                    <div className="flex items-center justify-between bg-muted p-2 rounded-md mt-2">
                      <div>
                        <div className="font-medium">{selectedItem.nama}</div>
                        <div className="text-sm text-muted-foreground">
                          Kode: {selectedItem.kodeBarcode} | Stok Saat Ini:{" "}
                          {selectedItem.stok}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedItem(null);
                          form.setValue("itemId", undefined as any);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  {form.formState.errors.itemId && (
                    <p className="text-sm font-medium text-destructive">
                      {form.formState.errors.itemId.message}
                    </p>
                  )}
                </div>

                {/* Tanggal Penyesuaian */}
                <FormField
                  control={form.control}
                  name="tanggal"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Tanggal Penyesuaian</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: id })
                              ) : (
                                <span>Pilih tanggal</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
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

                {/* Nomor Referensi */}
                <FormField
                  control={form.control}
                  name="nomorReferensi"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nomor Referensi (Opsional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Masukkan nomor referensi"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Nomor dokumen referensi internal jika ada.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Jenis Penyesuaian */}
                <FormField
                  control={form.control}
                  name="jenisPenyesuaian"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jenis Penyesuaian</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Reset tipe operasi dan jumlah saat jenis penyesuaian berubah
                          if (value === "Stok Opname") {
                            form.setValue("tipeOperasi", undefined as any);
                          } else {
                            // Set default tipe operasi berdasarkan jenis penyesuaian
                            if (
                              [
                                "Barang Masuk",
                                "Barang Ditemukan",
                                "Retur Jual",
                              ].includes(value)
                            ) {
                              form.setValue("tipeOperasi", "Tambah");
                            } else if (
                              [
                                "Barang Keluar",
                                "Barang Rusak",
                                "Barang Hilang",
                                "Retur Beli",
                              ].includes(value)
                            ) {
                              form.setValue("tipeOperasi", "Kurang");
                            }
                          }
                          updateCalculatedStock();
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih jenis penyesuaian" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {jenisAdjustmentOptions.map((option) => (
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

                {/* Stok Sebelum Penyesuaian (Read-only) */}
                {selectedItem && (
                  <div className="space-y-2">
                    <Label>Stok Sebelum Penyesuaian</Label>
                    <Input
                      value={selectedItem.stok}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                )}

                {/* Input Kuantitas Penyesuaian */}
                {watchJenisPenyesuaian && (
                  <div className="space-y-4 border p-4 rounded-md">
                    {watchJenisPenyesuaian === "Stok Opname" ? (
                      /* Stok Opname */
                      <FormField
                        control={form.control}
                        name="stokFisikBaru"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Stok Fisik Baru (Hasil Penghitungan)
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                placeholder="Masukkan jumlah stok fisik aktual"
                                {...field}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value) || 0;
                                  field.onChange(value);
                                  // Hitung jumlah penyesuaian berdasarkan stok fisik baru
                                  if (selectedItem) {
                                    const adjustment =
                                      value - selectedItem.stok;
                                    form.setValue(
                                      "jumlah",
                                      Math.abs(adjustment)
                                    );
                                    form.setValue(
                                      "tipeOperasi",
                                      adjustment >= 0 ? "Tambah" : "Kurang"
                                    );
                                    updateCalculatedStock();
                                  }
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : (
                      /* Penyesuaian Lainnya */
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
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem
                                      value="Tambah"
                                      id="tambah"
                                    />
                                    <Label htmlFor="tambah">Tambah Stok</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem
                                      value="Kurang"
                                      id="kurang"
                                    />
                                    <Label htmlFor="kurang">Kurang Stok</Label>
                                  </div>
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
                                  placeholder="Masukkan jumlah unit"
                                  {...field}
                                  onChange={(e) => {
                                    const value = parseInt(e.target.value) || 0;
                                    field.onChange(value);
                                    updateCalculatedStock();
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                  </div>
                )}

                {/* Stok Sesudah Penyesuaian (Read-only, Kalkulasi Otomatis) */}
                {selectedItem && calculatedStock !== null && (
                  <div className="space-y-2">
                    <Label>Stok Sesudah Penyesuaian</Label>
                    <Input
                      value={calculatedStock}
                      disabled
                      className="bg-muted font-medium"
                    />
                  </div>
                )}

                {/* Keterangan/Alasan */}
                <FormField
                  control={form.control}
                  name="keterangan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Keterangan/Alasan</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Masukkan detail atau alasan penyesuaian stok"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      Batal
                    </Button>
                  </DialogClose>
                  <Button type="submit" disabled={!selectedItem}>
                    Simpan Penyesuaian
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Riwayat Penyesuaian */}
      <div className="bg-card p-4 rounded-lg border shadow-sm">
        <h2 className="text-lg font-semibold mb-4">
          Filter Riwayat Penyesuaian
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="date-range">Rentang Tanggal</Label>
            <div className="flex items-center space-x-2">
              <Input id="date-from" type="date" className="w-full" />
              <span>-</span>
              <Input id="date-to" type="date" className="w-full" />
            </div>
          </div>
          <div>
            <Label htmlFor="search-item">Cari Barang</Label>
            <Input
              id="search-item"
              placeholder="Nama atau kode barang"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="adjustment-type">Jenis Penyesuaian</Label>
            <Select>
              <SelectTrigger id="adjustment-type">
                <SelectValue placeholder="Semua jenis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua jenis</SelectItem>
                {jenisAdjustmentOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end space-x-2 mt-4">
          <Button variant="outline">Reset Filter</Button>
          <Button>Terapkan Filter</Button>
        </div>
      </div>

      {/* Tabel Riwayat Penyesuaian Stok */}
      <div className="bg-card rounded-lg border shadow-sm">
        <Table>
          <TableCaption>
            Daftar riwayat penyesuaian stok inventaris.
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">No.</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>No. Referensi</TableHead>
              <TableHead>Nama Barang</TableHead>
              <TableHead>Jenis Penyesuaian</TableHead>
              <TableHead>Operasi</TableHead>
              <TableHead className="text-right">Jumlah</TableHead>
              <TableHead className="text-right">Stok Sebelum</TableHead>
              <TableHead className="text-right">Stok Sesudah</TableHead>
              <TableHead>User</TableHead>
              <TableHead className="w-[150px]">Keterangan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredHistory.length > 0 ? (
              filteredHistory.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    {format(item.tanggal, "dd MMM yyyy", { locale: id })}
                  </TableCell>
                  <TableCell>{item.nomorReferensi || "-"}</TableCell>
                  <TableCell>{item.namaBarang}</TableCell>
                  <TableCell>{item.jenisPenyesuaian}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium",
                        item.tipeOperasi === "Tambah"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      )}
                    >
                      {item.tipeOperasi}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{item.jumlah}</TableCell>
                  <TableCell className="text-right">
                    {item.stokSebelum}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.stokSesudah}
                  </TableCell>
                  <TableCell>{item.userPembuat}</TableCell>
                  <TableCell
                    className="max-w-[150px] truncate"
                    title={item.keterangan}
                  >
                    {item.keterangan || "-"}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={11}
                  className="text-center py-6 text-muted-foreground"
                >
                  Tidak ada data penyesuaian stok yang ditemukan.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Kontrol Paginasi */}
      <div className="flex items-center justify-end space-x-2">
        <Button variant="outline" size="sm" disabled>
          Sebelumnya
        </Button>
        <Button variant="outline" size="sm" disabled>
          Selanjutnya
        </Button>
      </div>
    </div>
  );
}
