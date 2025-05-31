"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  PlusCircle,
  Edit,
  Trash2,
  History,
  Search,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { id } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

// Define Zod schema for customer form validation
const customerFormSchema = z.object({
  nama: z.string().min(1, { message: "Nama pelanggan wajib diisi." }),
  noTelp: z.string().optional(),
  email: z
    .string()
    .email({ message: "Format email tidak valid." })
    .optional()
    .or(z.literal("")),
  alamat: z.string().optional(),
  kota: z.string().optional(),
  kodePos: z.string().optional(),
  jenisKelamin: z.string().optional(),
  tanggalRegistrasi: z.date().optional(),
  // loyaltyPoints: z.number().optional(), // Should be read-only or handled server-side
  catatan: z.string().optional(),
});

// Define type for Customer data based on Prisma schema
interface Customer {
  id: number;
  nama: string;
  jenisKelamin: string | null;
  noTelp: string | null;
  alamat: string | null;
  email: string | null;
  poinLoyalitas: number | null;
  tanggalRegistrasi: Date | null;
  kota: string | null;
  kodePos: string | null;
  // Add other fields from your schema if needed
}

interface CustomerResponse {
  success: boolean;
  data: Customer[];
  meta: {
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const form = useForm<z.infer<typeof customerFormSchema>>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      nama: "",
      noTelp: "",
      email: "",
      alamat: "",
      kota: "",
      kodePos: "",
      jenisKelamin: "",
      tanggalRegistrasi: undefined,
      catatan: "",
    },
  });

  // Fetch customers using react-query
  const { data, isLoading, error } = useQuery<CustomerResponse>({
    queryKey: ["customers", currentPage, pageSize, searchQuery, filterCity],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", currentPage.toString());
      params.append("pageSize", pageSize.toString());
      if (searchQuery) params.append("searchQuery", searchQuery);
      if (filterCity) params.append("filterCity", filterCity);

      const response = await fetch(`/api/customers?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch customers");
      }
      return response.json();
    },
    placeholderData: (previousData) => previousData, // Keep previous data while fetching new
  });

  const customers = data?.data || [];
  const totalCount = data?.meta.totalCount || 0;
  const totalPages = data?.meta.totalPages || 1;

  // Mutation for adding/editing customer
  const saveCustomerMutation = useMutation({
    mutationFn: async (
      customerData: z.infer<typeof customerFormSchema> & { id?: number }
    ) => {
      const url = customerData.id
        ? `/api/customers/${customerData.id}`
        : "/api/customers";
      const method = customerData.id ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nama: customerData.nama,
          noTelp: customerData.noTelp,
          email: customerData.email,
          alamat: customerData.alamat,
          kota: customerData.kota,
          kodePos: customerData.kodePos,
          jenisKelamin: customerData.jenisKelamin,
          tanggalRegistrasi: customerData.tanggalRegistrasi,
          catatan: customerData.catatan,
        }),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (jsonError) {
          // If response is not JSON, throw a generic error with status
          throw new Error(
            `Server returned status ${response.status}: ${response.statusText}`
          );
        }
        throw new Error(errorData.error || "Failed to save customer");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] }); // Refetch customers after save
      toast.success(
        selectedCustomer
          ? "Data pelanggan berhasil diperbarui."
          : "Pelanggan baru berhasil ditambahkan."
      );
      setIsAddEditDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast.error(error.message || "Gagal menyimpan data pelanggan.");
    },
  });

  // Mutation for deleting customer
  const deleteCustomerMutation = useMutation({
    mutationFn: async (customerId: number) => {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete customer");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] }); // Refetch customers after delete
      toast.success("Pelanggan berhasil dihapus.");
      setIsDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Gagal menghapus pelanggan.");
    },
  });

  const handleAddNewCustomer = () => {
    setSelectedCustomer(null);
    form.reset({
      nama: "",
      noTelp: "",
      email: "",
      alamat: "",
      kota: "",
      kodePos: "",
      jenisKelamin: "",
      tanggalRegistrasi: undefined,
      catatan: "",
    }); // Reset form for new customer
    setIsAddEditDialogOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    form.reset({
      ...customer,
      tanggalRegistrasi: customer.tanggalRegistrasi
        ? new Date(customer.tanggalRegistrasi)
        : undefined,
    }); // Populate form with customer data
    setIsAddEditDialogOpen(true);
  };

  const handleDeleteCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedCustomer) return;
    deleteCustomerMutation.mutate(selectedCustomer.id);
  };

  const onSubmit = async (values: z.infer<typeof customerFormSchema>) => {
    saveCustomerMutation.mutate({ ...values, id: selectedCustomer?.id });
  };

  // Handle pagination
  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const handleFirstPage = () => {
    setCurrentPage(1);
  };

  const handleLastPage = () => {
    setCurrentPage(totalPages);
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Manajemen Pelanggan"
        description="Lihat, tambah, edit, dan cari data pelanggan."
      />

      {/* I. Area Header & Aksi Utama */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Daftar Pelanggan</h2>
        <Button onClick={handleAddNewCustomer}>
          <UserPlus className="mr-2 h-4 w-4" />
          Tambah Pelanggan Baru
        </Button>
      </div>

      {/* III. Area Filter & Pencarian Pelanggan */}
      <div className="flex items-center gap-4 p-4 border rounded-md bg-card">
        <Input
          placeholder="Cari Pelanggan (Nama, Telepon, Email)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-grow"
        />
        {/* TODO: Implement Select for Customer Group Filter */}
        {/* <Select value={filterGroup} onValueChange={setFilterGroup}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Grup Pelanggan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Grup</SelectItem>
            <SelectItem value="Retail">Retail</SelectItem>
            <SelectItem value="Grosir">Grosir</SelectItem>
          </SelectContent>
        </Select> */}
        <Input
          placeholder="Filter Kota..."
          value={filterCity}
          onChange={(e) => setFilterCity(e.target.value)}
          className="w-[180px]"
        />
        <Button
          variant="outline"
          onClick={() => {
            setSearchQuery("");
            setFilterCity("");
            setCurrentPage(1);
          }}
        >
          Reset Filter
        </Button>
      </div>

      {/* IV. Tabel Data Pelanggan */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">No.</TableHead>
              <TableHead>ID Pelanggan</TableHead>
              <TableHead>Nama Pelanggan</TableHead>
              <TableHead>Nomor Telepon</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Kota</TableHead>
              <TableHead>Kode Pos</TableHead>
              <TableHead>Poin Loyalitas</TableHead>
              <TableHead>Tgl. Registrasi</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center h-24">
                  Memuat data pelanggan...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center h-24 text-red-500"
                >
                  Gagal memuat data pelanggan.
                </TableCell>
              </TableRow>
            ) : customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center h-24">
                  Tidak ada pelanggan yang cocok dengan kriteria Anda atau belum
                  ada pelanggan yang terdaftar.
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer, index) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    {(currentPage - 1) * pageSize + index + 1}
                  </TableCell>
                  <TableCell>{customer.id}</TableCell>
                  <TableCell>{customer.nama}</TableCell>
                  <TableCell>{customer.noTelp}</TableCell>
                  <TableCell>{customer.email}</TableCell>
                  <TableCell>{customer.kota}</TableCell>
                  <TableCell>{customer.kodePos}</TableCell>
                  <TableCell>{customer.poinLoyalitas || 0}</TableCell>
                  <TableCell>
                    {customer.tanggalRegistrasi
                      ? format(
                          new Date(customer.tanggalRegistrasi),
                          "dd MMM yyyy",
                          { locale: id }
                        )
                      : "N/A"}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditCustomer(customer)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteCustomer(customer)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    {/* TODO: Implement View Transaction History 
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Lihat Riwayat Transaksi"
                    >
                      <History className="h-4 w-4" />
                    </Button>
                    */}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* V. Kontrol Paginasi */}
      <div className="flex justify-end items-center space-x-2 pt-4">
        {/* Pagination controls */}
        {/* Rows per page control */}
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => {
              setPageSize(Number(value));
              setCurrentPage(1); // Reset to first page when page size changes
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 40, 50].map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* End Rows per page control */}
        <div className="flex items-center space-x-2">
          <span className="font-medium text-sm">
            Page {currentPage} dari {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={handleFirstPage}
            disabled={currentPage === 1 || isLoading}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={handlePreviousPage}
            disabled={currentPage === 1 || isLoading}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={handleNextPage}
            disabled={currentPage === totalPages || isLoading}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={handleLastPage}
            disabled={currentPage === totalPages || isLoading}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
        {/* End Pagination controls */}
      </div>

      {/* II. Dialog/Form Tambah/Edit Pelanggan */}
      <Dialog open={isAddEditDialogOpen} onOpenChange={setIsAddEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedCustomer
                ? `Edit Data Pelanggan: ${selectedCustomer.nama}`
                : "Tambah Pelanggan Baru"}
            </DialogTitle>
            <DialogDescription>
              Isi detail informasi pelanggan di bawah ini.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="nama"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Pelanggan *</FormLabel>
                    <FormControl>
                      <Input placeholder="Masukkan nama pelanggan" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="noTelp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nomor Telepon</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="Masukkan nomor telepon"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Pelanggan</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Masukkan email pelanggan"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="alamat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alamat Lengkap</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Masukkan alamat lengkap"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="kota"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kota</FormLabel>
                      <FormControl>
                        <Input placeholder="Masukkan kota" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="kodePos"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kode Pos</FormLabel>
                      <FormControl>
                        <Input placeholder="Masukkan kode pos" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="jenisKelamin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jenis Kelamin</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih jenis kelamin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                        <SelectItem value="Perempuan">Perempuan</SelectItem>
                        <SelectItem value="Tidak Disebutkan">
                          Tidak Disebutkan
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tanggalRegistrasi"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Tanggal Registrasi</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={`w-full pl-3 text-left font-normal ${
                              !field.value && "text-muted-foreground"
                            }`}
                          >
                            {field.value ? (
                              format(field.value, "dd MMM yyyy", { locale: id })
                            ) : (
                              <span>Pilih tanggal registrasi</span>
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
              {/* Loyalty Points - Read Only */}
              {selectedCustomer && (
                <FormField
                  control={form.control}
                  name="loyaltyPoints"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Poin Loyalitas</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          value={selectedCustomer.poinLoyalitas || 0}
                          readOnly
                          disabled
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={
                    form.formState.isSubmitting ||
                    saveCustomerMutation.isLoading
                  }
                >
                  {form.formState.isSubmitting || saveCustomerMutation.isLoading
                    ? "Menyimpan..."
                    : "Simpan"}
                </Button>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Batal
                  </Button>
                </DialogClose>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog Konfirmasi Hapus Pelanggan */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus Pelanggan</AlertDialogTitle>
            <AlertDialogDescription>
              Anda yakin ingin menghapus pelanggan "{selectedCustomer?.nama}"?
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteCustomerMutation.isLoading}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteCustomerMutation.isLoading}
            >
              {deleteCustomerMutation.isLoading ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
