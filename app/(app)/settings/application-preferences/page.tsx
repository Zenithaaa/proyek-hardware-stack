"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  // Pengaturan Pajak
  aktifkanPajak: z.boolean().default(false),
  namaPajak: z.string().optional(),
  persentasePajak: z.preprocess(
    (val) => Number(val),
    z.number().min(0).max(100).optional()
  ),
  hargaTermasukPajak: z.boolean().default(false),

  // Format Nomor Dokumen
  prefixNomorStruk: z.string().optional(),
  panjangDigitNomorUrut: z.preprocess(
    (val) => Number(val),
    z.number().int().min(1).optional()
  ),
  nomorStrukBerikutnya: z.preprocess(
    (val) => Number(val),
    z.number().int().min(0).optional()
  ), // Read-only or carefully editable

  // Pengaturan Mata Uang & Regional
  simbolMataUang: z.string().optional(),
  posisiSimbolMataUang: z.enum(["before", "after"]).optional(),
  jumlahDigitDesimal: z.preprocess(
    (val) => Number(val),
    z.number().int().min(0).optional()
  ),
  pemisahRibuan: z.string().optional(),
  pemisahDesimal: z.string().optional(),

  // Preferensi Cetak Struk
  ukuranKertasStrukDefault: z.enum(["58mm", "80mm"]).optional(),
  cetakLogoDiStruk: z.boolean().default(false),
  otomatisCetakStruk: z.boolean().default(false),

  // Pengaturan Inventaris Default
  defaultNotifikasiStokMinimum: z.preprocess(
    (val) => Number(val),
    z.number().int().min(0).optional()
  ),

  // Preferensi Tampilan Aplikasi
  temaAplikasi: z.enum(["system", "light", "dark"]).optional(),
  defaultJumlahItemPerHalaman: z.preprocess(
    (val) => Number(val),
    z.number().int().min(1).optional()
  ),
});

type ApplicationPreferencesFormValues = z.infer<typeof formSchema>;

export default function ApplicationPreferencesPage() {
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<ApplicationPreferencesFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      aktifkanPajak: false,
      namaPajak: "",
      persentasePajak: 0,
      hargaTermasukPajak: false,
      prefixNomorStruk: "",
      panjangDigitNomorUrut: 5,
      nomorStrukBerikutnya: 0,
      simbolMataUang: "Rp",
      posisiSimbolMataUang: "before",
      jumlahDigitDesimal: 0,
      pemisahRibuan: ".",
      pemisahDesimal: ",",
      ukuranKertasStrukDefault: "80mm",
      cetakLogoDiStruk: false,
      otomatisCetakStruk: false,
      defaultNotifikasiStokMinimum: 10,
      temaAplikasi: "system",
      defaultJumlahItemPerHalaman: 10,
    },
  });

  // Fetch initial data
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const response = await fetch("/api/settings/application-preferences");
        if (!response.ok) {
          throw new Error("Failed to fetch application preferences");
        }
        const data = await response.json();
        if (data) {
          // Ensure number fields are numbers
          const formattedData = {
            ...data,
            persentasePajak: Number(data.persentasePajak),
            panjangDigitNomorUrut: Number(data.panjangDigitNomorUrut),
            nomorStrukBerikutnya: Number(data.nomorStrukBerikutnya),
            jumlahDigitDesimal: Number(data.jumlahDigitDesimal),
            defaultNotifikasiStokMinimum: Number(
              data.defaultNotifikasiStokMinimum
            ),
            defaultJumlahItemPerHalaman: Number(
              data.defaultJumlahItemPerHalaman
            ),
          };
          form.reset(formattedData);
        }
      } catch (error) {
        console.error("Error fetching preferences:", error);
        toast.error("Gagal memuat preferensi aplikasi", {
          description: "Terjadi kesalahan saat mengambil pengaturan aplikasi.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreferences();
  }, [form]);

  const onSubmit = async (values: ApplicationPreferencesFormValues) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/settings/application-preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save preferences");
      }

      toast.success("Berhasil", {
        description: "Preferensi aplikasi berhasil diperbarui.",
      });
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast.error("Gagal menyimpan data", {
        description: `Terjadi kesalahan saat menyimpan preferensi aplikasi: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const aktifkanPajak = form.watch("aktifkanPajak");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Preferensi Aplikasi"
        description="Konfigurasi berbagai aspek perilaku dan default aplikasi POS Anda."
      />

      <Card>
        <CardHeader>
          <CardTitle>Pengaturan Preferensi</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div>Loading...</div> // Replace with skeleton loader
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                {/* Grup Field: Pengaturan Pajak */}
                <Card>
                  <CardHeader>
                    <CardTitle>Pengaturan Pajak Penjualan</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="aktifkanPajak"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Aktifkan Perhitungan Pajak pada Penjualan
                            </FormLabel>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="namaPajak"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nama Pajak (Contoh: PPN)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Nama Pajak"
                              {...field}
                              disabled={!aktifkanPajak}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="persentasePajak"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Persentase Pajak (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0-100"
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseFloat(e.target.value))
                              }
                              disabled={!aktifkanPajak}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="hargaTermasukPajak"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Harga Jual Barang Sudah Termasuk Pajak (Tax
                              Inclusive)
                            </FormLabel>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={!aktifkanPajak}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Grup Field: Format Nomor Dokumen */}
                <Card>
                  <CardHeader>
                    <CardTitle>Format Penomoran Dokumen</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="prefixNomorStruk"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Prefix Nomor Struk (Contoh: INV/POS/)
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Prefix" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="panjangDigitNomorUrut"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Jumlah Digit Nomor Urut (Contoh: 5 untuk 00001)
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Jumlah Digit"
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
                    <FormField
                      control={form.control}
                      name="nomorStrukBerikutnya"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Nomor Struk Berikutnya yang Akan Digunakan
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Nomor Berikutnya"
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseInt(e.target.value, 10))
                              }
                              // Consider making this readOnly={true} and managing it only via backend logic
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Grup Field: Pengaturan Mata Uang & Regional */}
                <Card>
                  <CardHeader>
                    <CardTitle>Pengaturan Mata Uang & Regional</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="simbolMataUang"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Simbol Mata Uang (Contoh: "Rp", "$")
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Simbol" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="posisiSimbolMataUang"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Posisi Simbol Mata Uang</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih posisi simbol" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="before">
                                Sebelum Nominal (Rp10.000)
                              </SelectItem>
                              <SelectItem value="after">
                                Setelah Nominal (10.000 Rp)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="jumlahDigitDesimal"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Jumlah Digit Desimal untuk Mata Uang (Contoh: 0
                            untuk Rp, 2 untuk USD)
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Jumlah Digit"
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
                    <FormField
                      control={form.control}
                      name="pemisahRibuan"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Karakter Pemisah Ribuan (Contoh: "." atau ",")
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Pemisah Ribuan" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="pemisahDesimal"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Karakter Pemisah Desimal (Contoh: "," atau ".")
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Pemisah Desimal" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Grup Field: Preferensi Cetak Struk */}
                <Card>
                  <CardHeader>
                    <CardTitle>Preferensi Cetak Struk</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="ukuranKertasStrukDefault"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ukuran Kertas Struk Default</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih ukuran kertas" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="58mm">58mm</SelectItem>
                              <SelectItem value="80mm">80mm</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="cetakLogoDiStruk"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Cetak Logo Toko di Struk (Hanya aktif jika logo
                              sudah diunggah di Info Toko)
                            </FormLabel>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              // TODO: Disable if no logo uploaded in Store Info
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="otomatisCetakStruk"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Cetak Struk Secara Otomatis Setelah Pembayaran
                              Sukses
                            </FormLabel>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Grup Field: Pengaturan Inventaris Default */}
                <Card>
                  <CardHeader>
                    <CardTitle>Pengaturan Inventaris Default</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="defaultNotifikasiStokMinimum"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Batas Stok Minimum Default untuk Notifikasi (Unit)
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Jumlah Unit"
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
                  </CardContent>
                </Card>

                {/* Grup Field: Preferensi Tampilan Aplikasi */}
                <Card>
                  <CardHeader>
                    <CardTitle>Preferensi Tampilan Aplikasi</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="temaAplikasi"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tema Aplikasi</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih tema" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="system">Sistem</SelectItem>
                              <SelectItem value="light">Terang</SelectItem>
                              <SelectItem value="dark">Gelap</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="defaultJumlahItemPerHalaman"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Jumlah Data Default per Halaman untuk Paginasi
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Jumlah Data"
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
                  </CardContent>
                </Card>

                {/* Tombol Aksi Form */}
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Menyimpan..." : "Simpan Preferensi Aplikasi"}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
