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

const formSchema = z.object({
  namaToko: z.string().min(1, { message: "Nama Toko wajib diisi." }),
  alamatToko: z.string().min(1, { message: "Alamat Toko wajib diisi." }),
  kotaToko: z.string().optional(),
  provinsiToko: z.string().optional(),
  kodePosToko: z.string().optional(),
  teleponToko: z.string().optional(),
  emailToko: z
    .string()
    .email({ message: "Format email tidak valid." })
    .optional()
    .or(z.literal("")), // Allow empty string
  websiteToko: z
    .string()
    .url({ message: "Format URL tidak valid." })
    .optional()
    .or(z.literal("")), // Allow empty string
  npwpToko: z.string().optional(),
  urlLogoToko: z.string().optional(), // Assuming URL is stored as string
  headerStruk: z.string().optional(),
  footerStruk: z.string().optional(),
});

type StoreInfoFormValues = z.infer<typeof formSchema>;

export default function StoreInfoPage() {
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<StoreInfoFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      namaToko: "",
      alamatToko: "",
      kotaToko: "",
      provinsiToko: "",
      kodePosToko: "",
      teleponToko: "",
      emailToko: "",
      websiteToko: "",
      npwpToko: "",
      urlLogoToko: "",
      headerStruk: "",
      footerStruk: "",
    },
  });

  // Fetch initial data
  useEffect(() => {
    const fetchStoreInfo = async () => {
      try {
        const response = await fetch("/api/settings/store-info");
        if (!response.ok) {
          throw new Error("Failed to fetch store info");
        }
        const data = await response.json();
        if (data) {
          form.reset(data);
        }
      } catch (error) {
        console.error("Error fetching store info:", error);
        toast.error("Gagal memuat data toko", {
          description: "Terjadi kesalahan saat mengambil informasi toko.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStoreInfo();
  }, [form, toast]);

  const onSubmit = async (values: StoreInfoFormValues) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/settings/store-info", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save store info");
      }

      toast.success("Berhasil", {
        description: "Informasi toko berhasil diperbarui.",
      });
    } catch (error) {
      console.error("Error saving store info:", error);
      toast.error("Gagal menyimpan data", {
        description: `Terjadi kesalahan saat menyimpan informasi toko: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // For preview, we can use FileReader to read the file as a data URL
      const reader = new FileReader();
      reader.onloadend = () => {
        // Update the form state with the data URL for preview
        form.setValue("urlLogoToko", reader.result as string);
      };
      reader.readAsDataURL(file);

      // TODO: Implement actual file upload to server/storage here
      // You would typically use FormData and fetch or a library like axios
      // to send the file to a dedicated upload endpoint.
      // After successful upload, update the form state with the actual URL from the server response.
    }
  };

  // TODO: Implement file upload logic for logo

  return (
    <div className="space-y-6 m-5">
      <PageHeader
        title="Informasi Toko"
        description="Kelola informasi dasar mengenai toko Anda."
      />

      <Card>
        <CardHeader>
          <CardTitle>Detail Toko</CardTitle>
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
                {/* Grup Field Informasi Dasar Toko */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="namaToko"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nama Toko</FormLabel>
                        <FormControl>
                          <Input placeholder="Nama Toko Anda" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="teleponToko"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nomor Telepon Toko</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="Nomor Telepon"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="alamatToko"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Alamat Lengkap Toko</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Alamat lengkap toko Anda"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="kotaToko"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kota</FormLabel>
                        <FormControl>
                          <Input placeholder="Kota" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="provinsiToko"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provinsi</FormLabel>
                        <FormControl>
                          <Input placeholder="Provinsi" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="kodePosToko"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kode Pos</FormLabel>
                        <FormControl>
                          <Input placeholder="Kode Pos" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="emailToko"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Toko</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="Email Toko"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="websiteToko"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website Toko (Opsional)</FormLabel>
                        <FormControl>
                          <Input
                            type="url"
                            placeholder="Website Toko"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="npwpToko"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>NPWP Toko (Opsional)</FormLabel>
                        <FormControl>
                          <Input placeholder="NPWP Toko" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Grup Field Logo Toko */}
                {/* TODO: Implement Logo Upload and Preview */}
                <div className="space-y-2">
                  <Label htmlFor="logo">Logo Toko (Opsional)</Label>
                  {/* File input and preview goes here */}
                  <Input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                  />
                  {/* Placeholder for image preview */}
                  {form.watch("urlLogoToko") && (
                    <div className="mt-2">
                      <img
                        src={form.watch("urlLogoToko")}
                        alt="Logo Preview"
                        className="w-24 h-24 object-contain"
                      />
                    </div>
                  )}
                </div>

                {/* Grup Field Informasi Tambahan Struk */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="headerStruk"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Teks Tambahan di Header Struk (Opsional)
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Teks di header struk"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="footerStruk"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Teks Tambahan di Footer Struk (Opsional)
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Teks di footer struk"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Tombol Aksi Form */}
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Menyimpan..." : "Simpan Informasi Toko"}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
