"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  PlusCircle,
  Edit,
  Trash2,
  History,
  Search,
  UserPlus,
} from "lucide-react";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
// import { DataTable } from "@/components/shared/DataTable"; // Placeholder for potential DataTable component

import { toast } from "sonner";

// TODO: Define Zod schema for customer form validation
// const customerFormSchema = z.object({...});

// TODO: Define type for Customer data
// type Customer = {...};

export default function CustomersPage() {
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null); // Replace 'any' with Customer type
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGroup, setFilterGroup] = useState("all");
  const [filterCity, setFilterCity] = useState("");

  // TODO: Replace with actual form schema
  const form = useForm({
    // resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      fullAddress: "",
      city: "",
      postalCode: "",
      gender: "",
      dateOfBirth: undefined,
      customerGroup: "",
      loyaltyPoints: 0, // Should be read-only or handled server-side
      notes: "",
    },
  });

  // TODO: Implement react-query for fetching customers
  // const { data: customers, isLoading, error } = useQuery(...);
  const customers: any[] = []; // Placeholder
  const isLoading = false; // Placeholder
  const error = null; // Placeholder

  const handleAddNewCustomer = () => {
    setSelectedCustomer(null);
    form.reset(); // Reset form for new customer
    setIsAddEditDialogOpen(true);
  };

  const handleEditCustomer = (customer: any) => {
    setSelectedCustomer(customer);
    form.reset(customer); // Populate form with customer data
    setIsAddEditDialogOpen(true);
  };

  const handleDeleteCustomer = (customer: any) => {
    setSelectedCustomer(customer);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedCustomer) return;
    // TODO: Implement delete action using Server Action
    // try {
    //   await deleteCustomerAction(selectedCustomer.id);
    //   toast.success(`Pelanggan "${selectedCustomer.name}" berhasil dihapus.`);
    //   setIsDeleteDialogOpen(false);
    //   // TODO: Refetch customer list
    // } catch (err) {
    //   toast.error("Gagal menghapus pelanggan.");
    // }
    console.log("Deleting customer:", selectedCustomer.name);
    toast.success(
      `Pelanggan "${selectedCustomer.name}" berhasil dihapus (simulasi).`
    );
    setIsDeleteDialogOpen(false);
  };

  const onSubmit = async (values: any) => {
    // TODO: Implement create/update action using Server Action
    if (selectedCustomer) {
      // Update existing customer
      // await updateCustomerAction({ ...selectedCustomer, ...values });
      toast.success(
        `Data pelanggan "${values.name}" berhasil diperbarui (simulasi).`
      );
    } else {
      // Create new customer
      // await createCustomerAction(values);
      toast.success(
        `Pelanggan "${values.name}" berhasil ditambahkan (simulasi).`
      );
    }
    setIsAddEditDialogOpen(false);
    form.reset();
    // TODO: Refetch customer list
  };

  // Placeholder for filtered customers
  const filteredCustomers = customers.filter((customer) => {
    const searchTerm = searchQuery.toLowerCase();
    const nameMatch = customer.name?.toLowerCase().includes(searchTerm);
    const phoneMatch = customer.phone?.toLowerCase().includes(searchTerm);
    const emailMatch = customer.email?.toLowerCase().includes(searchTerm);
    const groupMatch =
      filterGroup === "all" || customer.customerGroup === filterGroup;
    const cityMatch =
      filterCity === "" ||
      customer.city?.toLowerCase().includes(filterCity.toLowerCase());
    return (nameMatch || phoneMatch || emailMatch) && groupMatch && cityMatch;
  });

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
            setFilterGroup("all");
            setFilterCity("");
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
            ) : filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center h-24">
                  Tidak ada pelanggan yang cocok dengan kriteria Anda atau belum
                  ada pelanggan yang terdaftar.
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map((customer, index) => (
                <TableRow key={customer.id || index}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{customer.id || "N/A"}</TableCell>
                  <TableCell>{customer.name}</TableCell>
                  <TableCell>{customer.phone}</TableCell>
                  <TableCell>{customer.email}</TableCell>
                  <TableCell>{customer.city}</TableCell>
                  <TableCell>{customer.loyaltyPoints || 0}</TableCell>
                  <TableCell>
                    {customer.registrationDate
                      ? format(
                          new Date(customer.registrationDate),
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
                    {/* TODO: Implement View Transaction History */}
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Lihat Riwayat Transaksi"
                    >
                      <History className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* V. Kontrol Paginasi - Placeholder */}
      {/* TODO: Implement Pagination controls */}
      {/* <div className="flex justify-center items-center space-x-2 pt-4">
        <Button variant="outline">Pertama</Button>
        <Button variant="outline">Sebelumnya</Button>
        <span>Halaman X dari Y</span>
        <Button variant="outline">Berikutnya</Button>
        <Button variant="outline">Terakhir</Button>
      </div> */}

      {/* II. Dialog/Form Tambah/Edit Pelanggan */}
      <Dialog open={isAddEditDialogOpen} onOpenChange={setIsAddEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedCustomer
                ? `Edit Data Pelanggan: ${selectedCustomer.name}`
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
                name="name"
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
                  name="phone"
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
                name="fullAddress"
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
                  name="city"
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
                  name="postalCode"
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jenis Kelamin</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
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
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Tanggal Lahir</FormLabel>
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
                                format(field.value, "PPP", { locale: id })
                              ) : (
                                <span>Pilih tanggal lahir</span>
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
              </div>
              <FormField
                control={form.control}
                name="customerGroup"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grup Pelanggan</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih grup pelanggan" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {/* TODO: Populate with actual customer groups */}
                        <SelectItem value="Retail">Retail</SelectItem>
                        <SelectItem value="Grosir">Grosir</SelectItem>
                        <SelectItem value="Member Silver">
                          Member Silver
                        </SelectItem>
                        <SelectItem value="Member Gold">Member Gold</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="loyaltyPoints"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Poin Loyalitas</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} readOnly disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catatan Tambahan</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Masukkan catatan tambahan"
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
                <Button type="submit">Simpan Pelanggan</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* VI. Dialog Konfirmasi Hapus */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus Pelanggan</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus pelanggan "
              {selectedCustomer?.name}"? Tindakan ini tidak dapat diurungkan.
              Riwayat transaksi pelanggan ini akan tetap tersimpan namun tidak
              lagi terhubung ke pelanggan yang dihapus (atau sesuai kebijakan
              Anda).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
