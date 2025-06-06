"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { ChevronLeft, Plus, Trash2, Save } from "lucide-react";
import { useForm, useFieldArray, Controller } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Supplier = {
  id: string;
  nama: string;
};

type PurchaseOrder = {
  id: string;
  nomorPO: string;
  tanggalPembelian: string;
  idSupplier: string;
};

type Item = {
  id: string;
  nama: string;
  kode: string;
  satuan: string;
};

type POItem = {
  id: string;
  idItem: string;
  namaItem: string;
  kodeItem: string;
  jumlahDipesan: number;
  jumlahDiterima: number;
  satuan: string;
  hargaBeli: number;
};

type ReceiptFormData = {
  idSupplier: string;
  idPembelian: string | null;
  tanggalPenerimaan: Date;
  nomorSuratJalanSupplier: string;
  catatanPenerimaan: string;
  items: {
    idItem: string;
    jumlahDiterima: number;
    hargaBeliSaatTerima: number;
    idDetailPembelian?: string;
  }[];
};

export default function NewReceiptPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const poId = searchParams.get("poId");

  // State untuk data
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [poItems, setPOItems] = useState<POItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPOBased, setIsPOBased] = useState(!!poId);

  // Setup form
  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    reset, // Add reset here
    formState: { errors },
  } = useForm<ReceiptFormData>({
    defaultValues: {
      idSupplier: "",
      idPembelian: poId || null,
      tanggalPenerimaan: new Date(),
      nomorSuratJalanSupplier: "",
      catatanPenerimaan: "",
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const selectedSupplierId = watch("idSupplier");
  const selectedPOId = watch("idPembelian");

  // Fungsi untuk memuat data supplier
  const fetchSuppliers = async () => {
    try {
      const response = await fetch("/api/purchases/suppliers");
      const data = await response.json();
      if (data.success) {
        setSuppliers(data.data);
      } else {
        setError(data.error || "Gagal memuat data supplier");
      }
    } catch (err: any) {
      console.error("Error fetching suppliers:", err);
      setError("Gagal memuat data supplier");
    }
  };

  // Fungsi untuk memuat data PO berdasarkan supplier
  const fetchPurchaseOrders = async (supplierId: string) => {
    try {
      const response = await fetch(
        `/api/purchases/orders/by-supplier/${supplierId}`
      );
      const data = await response.json();
      if (data.success) {
        setPurchaseOrders(data.data);
      } else {
        setError(data.error || "Gagal memuat data pesanan pembelian");
      }
    } catch (err: any) {
      console.error("Error fetching purchase orders:", err);
      setError("Gagal memuat data pesanan pembelian");
    }
  };

  // Fungsi untuk memuat data item untuk penerimaan tanpa PO
  const fetchItems = async () => {
    try {
      const response = await fetch("/api/inventory/items");
      const data = await response.json();
      if (data.success) {
        setItems(data.data);
      } else {
        setError(data.error || "Gagal memuat data barang");
      }
    } catch (err: any) {
      console.error("Error fetching items:", err);
      setError("Gagal memuat data barang");
    }
  };

  // Fungsi untuk memuat detail item PO
  const fetchPOItems = async (poId: string) => {
    try {
      const response = await fetch(`/api/purchases/orders/${poId}/items`);
      const data = await response.json();
      if (data.success) {
        setPOItems(data.data);

        // Isi form dengan item PO
        setValue(
          "items",
          data.data.map((item: POItem) => ({
            idItem: item.idItem,
            jumlahDiterima: 0,
            hargaBeliSaatTerima: item.hargaBeli,
            idDetailPembelian: item.id,
          }))
        );
      } else {
        setError(data.error || "Gagal memuat detail pesanan pembelian");
      }
    } catch (err: any) {
      console.error("Error fetching PO items:", err);
      setError("Gagal memuat detail pesanan pembelian");
    } finally {
      setLoading(false);
    }
  };

  // Efek untuk memuat data awal
  useEffect(() => {
    const fetchData = async () => {
      await fetchSuppliers();
      await fetchItems();

      if (poId) {
        // Fetch PO details to get supplier ID
        try {
          const response = await fetch(`/api/purchases/orders/${poId}`);
          const poData = await response.json();
          if (poData.success && poData.data) {
            const supplierIdFromPO = poData.data.idSupplier;
            setValue("idSupplier", supplierIdFromPO);
            setValue("idPembelian", poId);
            setIsPOBased(true);
            fetchPOItems(poId);
          } else {
            setError(poData.error || "Gagal memuat detail PO");
            setLoading(false); // Stop loading if PO details fail
          }
        } catch (err: any) {
          console.error("Error fetching PO details:", err);
          setError("Gagal memuat detail PO");
          setLoading(false); // Stop loading if PO details fail
        }
      } else {
        setLoading(false); // Stop loading if no poId
      }
    };

    fetchData();
  }, [poId]); // Depend on poId

  // Efek untuk memuat PO ketika supplier berubah
  useEffect(() => {
    if (selectedSupplierId) {
      fetchPurchaseOrders(selectedSupplierId);
    }
  }, [selectedSupplierId]);

  // Efek untuk memuat item PO ketika PO berubah
  useEffect(() => {
    if (selectedPOId) {
      fetchPOItems(selectedPOId);
      setIsPOBased(true);
    } else {
      setPOItems([]);
      setValue("items", []);
      setIsPOBased(false);
    }
  }, [selectedPOId]);

  // Fungsi untuk menambah item baru (untuk penerimaan tanpa PO)
  const addNewItem = () => {
    append({
      idItem: "",
      jumlahDiterima: 0,
      hargaBeliSaatTerima: 0,
    });
  };

  // Fungsi untuk menangani submit form
  const onSubmit = async (data: ReceiptFormData) => {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/purchases/receipts/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Penerimaan barang berhasil dicatat!");
        reset(); // Reset form after successful submission
        router.push("/purchases/receipts"); // Redirect to receipts list page
      } else {
        setError(result.error || "Gagal mencatat penerimaan barang");
        toast.error(result.error || "Gagal mencatat penerimaan barang");
      }
    } catch (err: any) {
      console.error("Error submitting form:", err);
      setError("Gagal mencatat penerimaan barang");
      toast.error("Gagal mencatat penerimaan barang");
    } finally {
      setSubmitting(false);
    }
  };

  // Fungsi untuk kembali ke halaman sebelumnya
  const goBack = () => {
    router.back();
  };

  // Fungsi untuk mendapatkan nama item berdasarkan ID
  const getItemName = (itemId: string) => {
    const item = items.find((item) => item.id === itemId);
    return item ? item.nama : "";
  };

  // Fungsi untuk mendapatkan satuan item berdasarkan ID
  const getItemUnit = (itemId: string) => {
    const item = items.find((item) => item.id === itemId);
    return item ? item.satuan : "";
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center ml-5 space-x-2">
        <Button variant="outline" size="icon" onClick={goBack}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">Catat Penerimaan Barang Baru</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mx-5">
        {/* Form Bagian Header Penerimaan */}
        <Card>
          <CardHeader>
            <CardTitle>Informasi Penerimaan</CardTitle>
            <CardDescription>
              Masukkan informasi umum penerimaan barang
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Supplier */}
              <div className="space-y-2">
                <Label htmlFor="idSupplier">Supplier</Label>
                {/* Conditionally render Select only when suppliers are loaded and selectedSupplierId is set (if poId exists) */}
                {suppliers.length > 0 && (!poId || selectedSupplierId) ? (
                  <Select
                    disabled={!!poId}
                    value={selectedSupplierId}
                    onValueChange={(value) => setValue("idSupplier", value)}
                  >
                    <SelectTrigger id="idSupplier">
                      <SelectValue placeholder="Pilih supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input placeholder="Memuat supplier..." disabled />
                )}
                {errors.idSupplier && (
                  <p className="text-sm text-red-500">Supplier harus dipilih</p>
                )}
              </div>

              {/* Nomor PO Terkait */}
              <div className="space-y-2">
                <Label htmlFor="idPembelian">Nomor PO Terkait (Opsional)</Label>
                <Select
                  disabled={!!poId}
                  value={selectedPOId || ""}
                  onValueChange={(value) =>
                    setValue("idPembelian", value || null)
                  }
                >
                  <SelectTrigger id="idPembelian">
                    <SelectValue placeholder="Pilih nomor PO" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Tanpa PO</SelectItem>
                    {purchaseOrders.map((po) => (
                      <SelectItem key={po.id} value={po.id}>
                        {po.nomorPO} (
                        {format(new Date(po.tanggalPembelian), "dd MMM yyyy", {
                          locale: id,
                        })}
                        )
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tanggal Penerimaan */}
              <div className="space-y-2">
                <Label>Tanggal Penerimaan</Label>
                <Controller
                  control={control}
                  name="tanggalPenerimaan"
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? (
                            format(field.value, "dd MMMM yyyy", { locale: id })
                          ) : (
                            <span>Pilih tanggal</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {errors.tanggalPenerimaan && (
                  <p className="text-sm text-red-500">
                    Tanggal penerimaan harus diisi
                  </p>
                )}
              </div>

              {/* Nomor Surat Jalan Supplier */}
              <div className="space-y-2">
                <Label htmlFor="nomorSuratJalanSupplier">
                  Nomor Surat Jalan Supplier
                </Label>
                <Input
                  id="nomorSuratJalanSupplier"
                  {...register("nomorSuratJalanSupplier", {
                    required: "Nomor surat jalan harus diisi",
                  })}
                />
                {errors.nomorSuratJalanSupplier && (
                  <p className="text-sm text-red-500">
                    {errors.nomorSuratJalanSupplier.message}
                  </p>
                )}
              </div>

              {/* Nama Penerima 
              <div className="space-y-2">
                <Label>Nama Penerima</Label>
                <Input value="Admin" disabled />
                <p className="text-xs text-muted-foreground">
                  Otomatis diisi dari user yang login
                </p>
              </div>
              */}

              {/* Catatan Penerimaan */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="catatanPenerimaan">Catatan Penerimaan</Label>
                <Textarea
                  id="catatanPenerimaan"
                  {...register("catatanPenerimaan")}
                  placeholder="Catatan tambahan tentang penerimaan barang ini"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Bagian Detail Item Diterima */}
        <Card>
          <CardHeader>
            <CardTitle>Detail Item Diterima</CardTitle>
            <CardDescription>
              {isPOBased
                ? "Masukkan jumlah yang diterima untuk setiap item dalam PO"
                : "Tambahkan item yang diterima"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isPOBased ? (
              /* Tabel item berdasarkan PO */
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Barang</TableHead>
                      <TableHead>Kode Barang</TableHead>
                      <TableHead className="text-right">
                        Jumlah Dipesan
                      </TableHead>
                      <TableHead className="text-right">
                        Jumlah Sudah Diterima
                      </TableHead>
                      <TableHead className="text-right">
                        Jumlah Diterima Sekarang
                      </TableHead>
                      <TableHead>Satuan</TableHead>
                      <TableHead className="text-right">Harga Beli</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {poItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-4">
                          Tidak ada item dalam PO ini
                        </TableCell>
                      </TableRow>
                    ) : (
                      poItems.map((item, index) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.namaItem}</TableCell>
                          <TableCell>{item.kodeItem}</TableCell>
                          <TableCell className="text-right">
                            {item.jumlahDipesan}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.jumlahDiterima}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              className="w-24 text-right ml-auto"
                              {...register(`items.${index}.jumlahDiterima`, {
                                valueAsNumber: true,
                                min: {
                                  value: 0,
                                  message: "Jumlah tidak boleh negatif",
                                },
                                max: {
                                  value:
                                    item.jumlahDipesan - item.jumlahDiterima,
                                  message: "Jumlah melebihi sisa pesanan",
                                },
                              })}
                            />
                            {errors.items?.[index]?.jumlahDiterima && (
                              <p className="text-xs text-red-500 mt-1">
                                {errors.items[index]?.jumlahDiterima?.message}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>{item.satuan}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              className="w-32 text-right ml-auto"
                              {...register(
                                `items.${index}.hargaBeliSaatTerima`,
                                {
                                  valueAsNumber: true,
                                  min: {
                                    value: 0,
                                    message: "Harga tidak boleh negatif",
                                  },
                                }
                              )}
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            ) : (
              /* Form untuk penerimaan tanpa PO */
              <div className="space-y-4">
                {fields.length === 0 ? (
                  <div className="text-center py-4 border rounded-md">
                    <p className="text-muted-foreground">
                      Belum ada item yang ditambahkan
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addNewItem}
                      className="mt-2"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Tambah Item
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nama Barang</TableHead>
                            <TableHead className="text-right">Jumlah</TableHead>
                            <TableHead>Satuan</TableHead>
                            <TableHead className="text-right">
                              Harga Beli
                            </TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {fields.map((field, index) => {
                            const selectedItemId = watch(
                              `items.${index}.idItem`
                            );
                            return (
                              <TableRow key={field.id}>
                                <TableCell>
                                  <Select
                                    value={selectedItemId}
                                    onValueChange={(value) =>
                                      setValue(`items.${index}.idItem`, value)
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Pilih barang" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {items.map((item) => (
                                        <SelectItem
                                          key={item.id}
                                          value={item.id}
                                        >
                                          {item.nama} ({item.kode})
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {errors.items?.[index]?.idItem && (
                                    <p className="text-xs text-red-500 mt-1">
                                      Barang harus dipilih
                                    </p>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    className="w-24 text-right ml-auto"
                                    {...register(
                                      `items.${index}.jumlahDiterima`,
                                      {
                                        valueAsNumber: true,
                                        min: {
                                          value: 1,
                                          message: "Minimal 1",
                                        },
                                      }
                                    )}
                                  />
                                  {errors.items?.[index]?.jumlahDiterima && (
                                    <p className="text-xs text-red-500 mt-1">
                                      {
                                        errors.items[index]?.jumlahDiterima
                                          ?.message
                                      }
                                    </p>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {selectedItemId
                                    ? getItemUnit(selectedItemId)
                                    : "-"}
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    className="w-32 text-right ml-auto"
                                    {...register(
                                      `items.${index}.hargaBeliSaatTerima`,
                                      {
                                        valueAsNumber: true,
                                        min: {
                                          value: 0,
                                          message: "Harga tidak boleh negatif",
                                        },
                                      }
                                    )}
                                  />
                                  {errors.items?.[index]
                                    ?.hargaBeliSaatTerima && (
                                    <p className="text-xs text-red-500 mt-1">
                                      {
                                        errors.items[index]?.hargaBeliSaatTerima
                                          ?.message
                                      }
                                    </p>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => remove(index)}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addNewItem}
                      className="mt-2"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Tambah Item Lain
                    </Button>
                  </>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" type="button" onClick={goBack}>
              Batal
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Menyimpan..." : "Simpan Penerimaan"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
