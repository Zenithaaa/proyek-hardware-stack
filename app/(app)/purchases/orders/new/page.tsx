"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Trash2, Plus } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// Interface untuk item PO
interface POItem {
  id: number;
  itemId: number;
  nama: string;
  deskripsi: string;
  jumlah: number;
  satuan: string;
  hargaSatuan: number;
  subtotal: number;
}

export default function CreatePurchaseOrderPage() {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [tanggalPO, setTanggalPO] = useState<Date>(new Date());
  const [tanggalJatuhTempo, setTanggalJatuhTempo] = useState<Date | null>(null);
  const [nomorPO, setNomorPO] = useState("");
  const [alamatPengiriman, setAlamatPengiriman] = useState("");
  const [syaratPembayaran, setSyaratPembayaran] = useState("");
  const [catatan, setCatatan] = useState("");

  // State untuk item PO
  const [poItems, setPOItems] = useState<POItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [itemJumlah, setItemJumlah] = useState<number>(1);
  const [itemHarga, setItemHarga] = useState<number>(0);
  const [itemDeskripsi, setItemDeskripsi] = useState<string>("");

  // State untuk ringkasan total
  const [diskonPO, setDiskonPO] = useState<number>(0);
  const [pajakPO, setPajakPO] = useState<number>(0);
  const [biayaPengiriman, setBiayaPengiriman] = useState<number>(0);

  // Fetch suppliers data
  const { data: suppliersData } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const res = await fetch("/api/purchases/orders/data");
      if (!res.ok) {
        throw new Error("Failed to fetch suppliers and items");
      }
      return res.json();
    },
  });

  // Fetch items data
  const { data: itemsData } = useQuery({
    queryKey: ["items"],
    queryFn: async () => {
      const res = await fetch("/api/purchases/orders/data");
      if (!res.ok) {
        throw new Error("Failed to fetch suppliers and items");
      }
      return res.json();
    },
    select: (data) => data.items, // Select only items from the fetched data
  });

  const suppliers = suppliersData?.suppliers || [];
  const items = itemsData || [];

  // Generate nomor PO otomatis
  const generatePONumber = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    return `PO-${year}${month}-${random}`;
  };

  // Handle supplier change
  const handleSupplierChange = (value: string) => {
    setSupplierId(Number(value));
    // Generate nomor PO jika belum ada
    if (!nomorPO) {
      setNomorPO(generatePONumber());
    }
  };

  // Handle item selection
  const handleItemSelect = (value: string) => {
    const itemId = Number(value);
    setSelectedItemId(itemId);

    // Cari item dari data
    const selectedItem = items.find((item) => item.id === itemId);
    if (selectedItem) {
      setItemHarga(selectedItem.hargaBeli);
      setItemDeskripsi(selectedItem.nama);
    }
  };

  // Handle add item to PO
  const handleAddItem = () => {
    if (!selectedItemId || itemJumlah <= 0) return;

    const selectedItem = items.find((item) => item.id === selectedItemId);
    if (!selectedItem) return;

    const newItem: POItem = {
      id: Date.now(), // Temporary ID
      itemId: selectedItemId,
      nama: selectedItem.nama,
      deskripsi: itemDeskripsi,
      jumlah: itemJumlah,
      satuan: selectedItem.satuan,
      hargaSatuan: itemHarga,
      subtotal: itemJumlah * itemHarga,
    };

    setPOItems([...poItems, newItem]);

    // Reset form
    setSelectedItemId(null);
    setItemJumlah(1);
    setItemHarga(0);
    setItemDeskripsi("");
  };

  // Handle remove item from PO
  const handleRemoveItem = (itemId: number) => {
    setPOItems(poItems.filter((item) => item.id !== itemId));
  };

  // Calculate totals
  const subtotal = poItems.reduce((sum, item) => sum + item.subtotal, 0);
  const diskonNominal = (diskonPO / 100) * subtotal;
  const pajakNominal = (pajakPO / 100) * (subtotal - diskonNominal);
  const grandTotal = subtotal - diskonNominal + pajakNominal + biayaPengiriman;

  // Handle save as draft
  const handleSaveAsDraft = async () => {
    try {
      // Validasi minimal
      if (!supplierId || poItems.length === 0) {
        alert("Harap pilih supplier dan tambahkan minimal satu item");
        return;
      }

      const poData = {
        supplierId,
        nomorPO,
        tanggalPesan: tanggalPO,
        tanggalJatuhTempo,
        alamatPengiriman,
        syaratPembayaran,
        catatan,
        items: poItems.map((item) => ({
          itemId: item.itemId,
          jumlahPesan: item.jumlah,
          hargaBeli: item.hargaSatuan,
          subtotal: item.subtotal,
          // Add other necessary fields for DetailPembelianKeSupplier
        })),
        subtotal,
        diskon: diskonPO,
        pajak: pajakPO,
        biayaLain: biayaPengiriman, // Map biayaPengiriman to biayaLain in schema
        total: grandTotal,
        status: "Draft",
        // Assuming a default user ID for now, replace with actual user ID later
        userPenerimaId: 1, // Replace with actual user ID
      };

      console.log("Saving PO as draft:", poData);

      const res = await fetch("/api/purchases/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(poData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save purchase order");
      }

      // Redirect ke halaman daftar PO
      router.push("/purchases/orders");
    } catch (error) {
      console.error("Error saving PO:", error);
    }
  };

  // Handle save and send PO
  const handleSaveAndSend = async () => {
    try {
      // Validasi minimal
      if (!supplierId || poItems.length === 0) {
        alert("Harap pilih supplier dan tambahkan minimal satu item");
        return;
      }

      const poData = {
        supplierId,
        nomorPO,
        tanggalPesan: tanggalPO,
        tanggalJatuhTempo,
        alamatPengiriman,
        syaratPembayaran,
        catatan,
        items: poItems.map((item) => ({
          itemId: item.itemId,
          jumlahPesan: item.jumlah,
          hargaBeli: item.hargaSatuan,
          subtotal: item.subtotal,
          // Add other necessary fields for DetailPembelianKeSupplier
        })),
        subtotal,
        diskon: diskonPO,
        pajak: pajakPO,
        biayaLain: biayaPengiriman, // Map biayaPengiriman to biayaLain in schema
        total: grandTotal,
        status: "Dipesan",
        // Assuming a default user ID for now, replace with actual user ID later
        userPenerimaId: 1, // Replace with actual user ID
      };

      console.log("Saving and sending PO:", poData);

      const res = await fetch("/api/purchases/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(poData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(
          errorData.error || "Failed to save and send purchase order"
        );
      }

      // Redirect ke halaman daftar PO
      router.push("/purchases/orders");
    } catch (error) {
      console.error("Error saving and sending PO:", error);
    }
  };

  return (
    <div className="container py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 sm:h-10 sm:w-10"
            onClick={() => router.push("/purchases/orders")}
          >
            <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
          <h1 className="text-xl font-bold sm:text-2xl">
            Buat Pesanan Pembelian Baru
          </h1>
        </div>
      </div>

      {/* Form */}
      <div className="grid gap-4 sm:gap-6">
        {/* Header PO */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-3 sm:space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier">
                    Supplier <span className="text-destructive">*</span>
                  </Label>
                  <Select onValueChange={handleSupplierChange}>
                    <SelectTrigger id="supplier">
                      <SelectValue placeholder="Pilih Supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem
                          key={supplier.id}
                          value={supplier.id.toString()}
                        >
                          {supplier.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tanggalPO">
                    Tanggal PO <span className="text-destructive">*</span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        {tanggalPO ? (
                          format(tanggalPO, "dd MMMM yyyy", { locale: id })
                        ) : (
                          <span>Pilih tanggal</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={tanggalPO}
                        onSelect={(date) => date && setTanggalPO(date)}
                        initialFocus
                        locale={id}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tanggalJatuhTempo">Tanggal Jatuh Tempo</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        {tanggalJatuhTempo ? (
                          format(tanggalJatuhTempo, "dd MMMM yyyy", {
                            locale: id,
                          })
                        ) : (
                          <span>Pilih tanggal</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={tanggalJatuhTempo}
                        onSelect={(date) => setTanggalJatuhTempo(date)}
                        initialFocus
                        locale={id}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="syaratPembayaran">Syarat Pembayaran</Label>
                  <Select onValueChange={setSyaratPembayaran}>
                    <SelectTrigger id="syaratPembayaran">
                      <SelectValue placeholder="Pilih Syarat Pembayaran" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COD">
                        COD (Cash On Delivery)
                      </SelectItem>
                      <SelectItem value="Net 7">Net 7 Hari</SelectItem>
                      <SelectItem value="Net 14">Net 14 Hari</SelectItem>
                      <SelectItem value="Net 30">Net 30 Hari</SelectItem>
                      <SelectItem value="Net 60">Net 60 Hari</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nomorPO">
                    Nomor PO <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="nomorPO"
                    value={nomorPO}
                    onChange={(e) => setNomorPO(e.target.value)}
                    placeholder="Otomatis dibuat"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="alamatPengiriman">Alamat Pengiriman</Label>
                  <Textarea
                    id="alamatPengiriman"
                    value={alamatPengiriman}
                    onChange={(e) => setAlamatPengiriman(e.target.value)}
                    placeholder="Alamat lengkap pengiriman"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="catatan">Catatan Internal PO</Label>
                  <Textarea
                    id="catatan"
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    placeholder="Catatan internal untuk tim"
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detail Item PO */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold mb-4">Detail Item PO</h2>

            {/* Form tambah item */}
            <div className="grid gap-3 sm:grid-cols-5">
              <div className="sm:col-span-2">
                <Label htmlFor="pilihBarang">Pilih Barang</Label>
                <Select onValueChange={handleItemSelect}>
                  <SelectTrigger id="pilihBarang">
                    <SelectValue placeholder="Pilih Barang" />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map((item) => (
                      <SelectItem key={item.id} value={item.id.toString()}>
                        {item.kodeBarcode} - {item.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="jumlahPesan">Jumlah</Label>
                <Input
                  id="jumlahPesan"
                  type="number"
                  min="1"
                  value={itemJumlah}
                  onChange={(e) => setItemJumlah(Number(e.target.value))}
                />
              </div>

              <div>
                <Label htmlFor="hargaSatuan">Harga Satuan (Rp)</Label>
                <Input
                  id="hargaSatuan"
                  type="number"
                  min="0"
                  value={itemHarga}
                  onChange={(e) => setItemHarga(Number(e.target.value))}
                />
              </div>

              <div className="flex items-end">
                <Button onClick={handleAddItem} className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Tambah
                </Button>
              </div>
            </div>

            {/* Tabel item */}
            <div className="border rounded-md overflow-x-auto mt-4">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Barang</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead>Jumlah</TableHead>
                    <TableHead>Satuan</TableHead>
                    <TableHead>Harga Satuan (Rp)</TableHead>
                    <TableHead>Subtotal (Rp)</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {poItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6">
                        Belum ada item ditambahkan
                      </TableCell>
                    </TableRow>
                  ) : (
                    poItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.nama}</TableCell>
                        <TableCell>{item.deskripsi}</TableCell>
                        <TableCell>{item.jumlah}</TableCell>
                        <TableCell>{item.satuan}</TableCell>
                        <TableCell>
                          {new Intl.NumberFormat("id-ID").format(
                            item.hargaSatuan
                          )}
                        </TableCell>
                        <TableCell>
                          {new Intl.NumberFormat("id-ID").format(item.subtotal)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Ringkasan Total */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold mb-4">Ringkasan Total</h2>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="diskonPO">Diskon PO (%)</Label>
                  <Input
                    id="diskonPO"
                    type="number"
                    min="0"
                    max="100"
                    value={diskonPO}
                    onChange={(e) => setDiskonPO(Number(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pajakPO">Pajak Pembelian (PPN %)</Label>
                  <Input
                    id="pajakPO"
                    type="number"
                    min="0"
                    value={pajakPO}
                    onChange={(e) => setPajakPO(Number(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="biayaPengiriman">Biaya Pengiriman (Rp)</Label>
                  <Input
                    id="biayaPengiriman"
                    type="number"
                    min="0"
                    value={biayaPengiriman}
                    onChange={(e) => setBiayaPengiriman(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-4 bg-muted p-4 rounded-lg">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-medium">
                    Rp {new Intl.NumberFormat("id-ID").format(subtotal)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Diskon ({diskonPO}%):</span>
                  <span className="font-medium">
                    Rp {new Intl.NumberFormat("id-ID").format(diskonNominal)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Pajak ({pajakPO}%):</span>
                  <span className="font-medium">
                    Rp {new Intl.NumberFormat("id-ID").format(pajakNominal)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Biaya Pengiriman:</span>
                  <span className="font-medium">
                    Rp {new Intl.NumberFormat("id-ID").format(biayaPengiriman)}
                  </span>
                </div>

                <Separator className="my-2" />

                <div className="flex justify-between text-lg font-bold">
                  <span>Grand Total:</span>
                  <span>
                    Rp {new Intl.NumberFormat("id-ID").format(grandTotal)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4 mx-5">
          {/* 
          <Button variant="outline" onClick={handleSaveAsDraft}>
            Simpan sebagai Draft
          </Button>
          */}
          <Button onClick={handleSaveAndSend}>Simpan dan Kirim PO</Button>
        </div>
      </div>
    </div>
  );
}
