"use client";

import { useEffect, useState, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useReactToPrint } from "react-to-print";
import { toast } from "sonner";
import Script from "next/script";

// Components
import PrintReceipt from "@/components/print-receipt";

// Shadcn Components
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Icons
import {
  FilePlus2,
  PauseCircle,
  PlayCircle,
  XCircle,
  Users,
  UserX,
  Trash2,
  Printer,
  Receipt,
} from "lucide-react";

// Types
type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  discount: number;
  subtotal: number;
};

type Customer = {
  id: string;
  name: string;
  phone?: string;
  points?: number;
  address?: string;
};

type PaymentMethod = "CASH" | "DEBIT_CREDIT" | "QRIS" | "E_WALLET";

type Payment = {
  method: PaymentMethod;
  amount: number;
  status: "PENDING" | "SUCCESS" | "FAILED";
  midtransToken?: string;
  midtransRedirectUrl?: string;
};

// Validation Schema
const paymentSchema = z.object({
  amount: z.number().min(0, "Jumlah tidak boleh negatif"),
  method: z.enum(["CASH", "DEBIT_CREDIT", "QRIS", "E_WALLET"]),
});

export default function POSPage() {
  const { user } = useUser();
  const [sessionId, setSessionId] = useState<string>("");
  const [transactionId, setTransactionId] = useState<string>("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [needDelivery, setNeedDelivery] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryPostalCode, setDeliveryPostalCode] = useState("");
  const [deliveryRecipientPhone, setDeliveryRecipientPhone] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [taxPercent, setTaxPercent] = useState(11); // PPN 11%
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isTransactionComplete, setIsTransactionComplete] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [customerSearchResults, setCustomerSearchResults] = useState<any[]>([]);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [heldTransactions, setHeldTransactions] = useState<any[]>([]);
  const printReceiptRef = useRef<HTMLDivElement>(null);

  // Form untuk pembayaran tunai
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(paymentSchema),
  });

  useEffect(() => {
    // Buat sesi kasir di database saat komponen dimuat
    const createCashierSession = async () => {
      try {
        if (user?.id) {
          const response = await fetch("/api/cashier-sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: user.id,
              modalAwal: 0, // Nilai default
              catatanSesi: "Sesi dibuat otomatis",
            }),
          });

          const result = await response.json();
          if (response.ok) {
            setSessionId(result.data.id);
            toast.success("Sesi kasir berhasil dibuat");
          } else {
            toast.error("Gagal membuat sesi kasir: " + result.error);
            // Fallback ke ID sementara jika gagal
            setSessionId(`SESSION_${Date.now()}`);
          }
        } else {
          // Fallback jika user belum tersedia
          setSessionId(`SESSION_${Date.now()}`);
        }
        generateNewTransactionId();
      } catch (error) {
        console.error("Error creating cashier session:", error);
        toast.error("Gagal membuat sesi kasir");
        // Fallback ke ID sementara jika gagal
        setSessionId(`SESSION_${Date.now()}`);
        generateNewTransactionId();
      }
    };

    createCashierSession();
  }, [user?.id]);

  const generateNewTransactionId = () => {
    const newTransactionId = `TRX_${Date.now()}`;
    setTransactionId(newTransactionId);
  };

  // Fungsi untuk menghitung total belanja
  const calculateTotal = () => {
    const subtotal = cart.reduce((acc, item) => acc + item.subtotal, 0);
    const discountAmount = (subtotal * discountPercent) / 100;
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = (afterDiscount * taxPercent) / 100;
    return afterDiscount + taxAmount + deliveryFee;
  };

  // Fungsi untuk mendapatkan rincian perhitungan
  const getCalculationDetails = () => {
    const subtotal = cart.reduce((acc, item) => acc + item.subtotal, 0);
    const discountAmount = (subtotal * discountPercent) / 100;
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = (afterDiscount * taxPercent) / 100;
    return {
      subtotal,
      discountAmount,
      afterDiscount,
      taxAmount,
      total: afterDiscount + taxAmount + deliveryFee,
    };
  };

  // Fungsi pencarian barang
  const searchItems = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/items/search?q=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      toast.error("Gagal mencari barang");
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  // Fungsi pencarian pelanggan
  const searchCustomers = async (query: string) => {
    if (!query.trim()) {
      setCustomerSearchResults([]);
      return;
    }
    setIsSearchingCustomer(true);
    try {
      const response = await fetch(
        `/api/customers/search?q=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      setCustomerSearchResults(data);
    } catch (error) {
      toast.error("Gagal mencari pelanggan");
      console.error(error);
    } finally {
      setIsSearchingCustomer(false);
    }
  };

  // Fungsi untuk menambah item ke keranjang
  const addToCart = (item: any) => {
    const existingItem = cart.find((cartItem) => cartItem.id === item.id);
    if (existingItem) {
      setCart(
        cart.map((cartItem) =>
          cartItem.id === item.id
            ? {
                ...cartItem,
                quantity: cartItem.quantity + 1,
                subtotal: (cartItem.quantity + 1) * cartItem.price,
              }
            : cartItem
        )
      );
    } else {
      setCart([
        ...cart,
        {
          id: item.id,
          name: item.nama,
          price: item.hargaJual,
          quantity: 1,
          discount: 0,
          subtotal: item.hargaJual,
        },
      ]);
    }
    setSearchQuery("");
    setSearchResults([]);
    toast.success("Barang ditambahkan ke keranjang");
  };

  // Fungsi untuk mengupdate quantity item
  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    setCart(
      cart.map((item) =>
        item.id === itemId
          ? {
              ...item,
              quantity: newQuantity,
              subtotal: newQuantity * item.price,
            }
          : item
      )
    );
  };

  // Fungsi untuk menghapus item dari keranjang
  const removeFromCart = (itemId: string) => {
    setCart(cart.filter((item) => item.id !== itemId));
    toast.success("Barang dihapus dari keranjang");
  };

  // Fungsi untuk menahan transaksi
  const holdTransaction = () => {
    if (cart.length === 0) {
      toast.error("Keranjang belanja kosong");
      return;
    }
    setHeldTransactions([
      ...heldTransactions,
      {
        id: Date.now(),
        cart: [...cart],
        customer: selectedCustomer,
        needDelivery,
        deliveryAddress,
        deliveryCity,
        deliveryPostalCode,
        deliveryRecipientPhone,
        deliveryNote,
        deliveryFee,
      },
    ]);
    setCart([]);
    setSelectedCustomer(null);
    setNeedDelivery(false);
    setDeliveryAddress("");
    setDeliveryCity("");
    setDeliveryPostalCode("");
    setDeliveryRecipientPhone("");
    setDeliveryNote("");
    setDeliveryFee(0);
    toast.success("Transaksi ditahan");
  };

  // Fungsi untuk memanggil transaksi yang ditahan
  const recallTransaction = (transactionId: number) => {
    const transaction = heldTransactions.find((t) => t.id === transactionId);
    if (transaction) {
      setCart(transaction.cart);
      setSelectedCustomer(transaction.customer);
      setNeedDelivery(transaction.needDelivery);
      setDeliveryAddress(transaction.deliveryAddress);
      setDeliveryCity(transaction.deliveryCity);
      setDeliveryPostalCode(transaction.deliveryPostalCode);
      setDeliveryRecipientPhone(transaction.deliveryRecipientPhone);
      setDeliveryNote(transaction.deliveryNote);
      setDeliveryFee(transaction.deliveryFee);
      setHeldTransactions(
        heldTransactions.filter((t) => t.id !== transactionId)
      );
      toast.success("Transaksi dipanggil kembali");
    }
  };

  // Handler untuk menambah metode pembayaran
  const handleAddPayment = () => {
    if (payments.length >= 2) {
      toast.error("Maksimal 2 metode pembayaran");
      return;
    }
    setPayments([
      ...payments,
      { method: "CASH", amount: 0, status: "PENDING" },
    ]);
  };

  // Handler untuk pembayaran tunai
  const handleCashPayment = async (data: any) => {
    setIsProcessingPayment(true);
    try {
      // Verifikasi sesi kasir terlebih dahulu
      if (!sessionId || sessionId.startsWith("SESSION_")) {
        // Jika sessionId tidak valid (masih menggunakan format lokal), buat sesi kasir baru
        try {
          if (user?.id) {
            const sessionResponse = await fetch("/api/cashier-sessions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId: user.id,
                modalAwal: 0,
                catatanSesi: "Sesi dibuat otomatis saat transaksi tunai",
              }),
            });

            const sessionResult = await sessionResponse.json();
            if (sessionResponse.ok) {
              setSessionId(sessionResult.data.id);
            } else {
              throw new Error(
                sessionResult.error || "Gagal membuat sesi kasir"
              );
            }
          } else {
            throw new Error("User ID tidak tersedia");
          }
        } catch (sessionError) {
          console.error("Error creating cashier session:", sessionError);
          toast.error("Gagal membuat sesi kasir. Silakan coba lagi.");
          setIsProcessingPayment(false);
          return;
        }
      }

      // Proses pembayaran tunai
      const updatedPayments = payments.map((payment) =>
        payment.method === "CASH"
          ? { ...payment, amount: data.amount, status: "SUCCESS" }
          : payment
      );
      setPayments(updatedPayments);

      if (updatedPayments.every((p) => p.status === "SUCCESS")) {
        // Simpan transaksi ke database
        const response = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user?.id,
            pelangganId: selectedCustomer?.id,
            cart,
            needDelivery,
            deliveryAddress,
            deliveryNote,
            deliveryFee,
            sesiKasirId: sessionId, // Sekarang sessionId sudah valid
            payments: updatedPayments,
          }),
        });

        const result = await response.json();
        if (!response.ok)
          throw new Error(
            result.error || result.message || "Gagal menyimpan transaksi"
          );

        setIsTransactionComplete(true);
        toast.success("Pembayaran berhasil!");
      }
    } catch (error: any) {
      console.error("Error processing cash payment:", error);
      toast.error(
        `Gagal memproses pembayaran tunai: ${
          error.message || "Terjadi kesalahan"
        }`
      );
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Handler untuk pembayaran Midtrans
  const handleMidtransPayment = async (method: PaymentMethod) => {
    setIsProcessingPayment(true);
    try {
      // Verifikasi sesi kasir terlebih dahulu
      if (!sessionId || sessionId.startsWith("SESSION_")) {
        // Jika sessionId tidak valid (masih menggunakan format lokal), buat sesi kasir baru
        try {
          if (user?.id) {
            const sessionResponse = await fetch("/api/cashier-sessions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId: user.id,
                modalAwal: 0,
                catatanSesi: "Sesi dibuat otomatis saat transaksi",
              }),
            });

            const sessionResult = await sessionResponse.json();
            if (sessionResponse.ok) {
              setSessionId(sessionResult.data.id);
            } else {
              throw new Error(
                sessionResult.error || "Gagal membuat sesi kasir"
              );
            }
          } else {
            throw new Error("User ID tidak tersedia");
          }
        } catch (sessionError) {
          console.error("Error creating cashier session:", sessionError);
          toast.error("Gagal membuat sesi kasir. Silakan coba lagi.");
          setIsProcessingPayment(false);
          return;
        }
      }

      // Simpan transaksi terlebih dahulu dengan status PENDING
      const saveTransactionResponse = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          pelangganId: selectedCustomer?.id,
          cart,
          needDelivery,
          deliveryAddress,
          deliveryNote,
          deliveryFee,
          sesiKasirId: sessionId, // Sekarang sessionId sudah valid
          payments: payments.map((payment) =>
            payment.method === method
              ? { ...payment, status: "PENDING" }
              : payment
          ),
        }),
      });

      const savedTransaction = await saveTransactionResponse.json();
      if (!saveTransactionResponse.ok) {
        throw new Error(
          savedTransaction.error ||
            savedTransaction.message ||
            "Gagal menyimpan transaksi"
        );
      }

      // Inisiasi pembayaran Midtrans
      const response = await fetch("/api/payments/midtrans/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: transactionId,
          amount: calculateTotal(),
          paymentType: method.toLowerCase(),
          customerDetails: selectedCustomer
            ? {
                firstName: selectedCustomer.name,
                phone: selectedCustomer.phone,
                address: selectedCustomer.address,
              }
            : undefined,
        }),
      });

      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error || result.message || "Gagal memulai pembayaran Midtrans"
        );

      const updatedPayments = payments.map((payment) =>
        payment.method === method
          ? {
              ...payment,
              midtransToken: result.token,
              midtransRedirectUrl: result.redirectUrl,
              transactionType: "Payment",
              channel: method,
              amount: calculateTotal(),
            }
          : payment
      );
      setPayments(updatedPayments);

      // Gunakan script Midtrans yang sudah dimuat di layout.tsx
      if ((window as any).snap) {
        // Buka popup Midtrans
        (window as any).snap.pay(result.token, {
          onSuccess: () => {
            toast.success("Pembayaran Midtrans berhasil!");
            checkPaymentStatus(transactionId);
            // Update UI untuk menunjukkan pembayaran berhasil
            const button = document.querySelector("[data-payment-button]");
            if (button) {
              button.textContent = "Berhasil Melakukan Pembayaran";
              button.classList.remove("bg-blue-500");
              button.classList.add("bg-green-500");
            }
            // Tampilkan tombol cetak struk
            const printButton = document.querySelector("[data-print-button]");
            if (printButton) {
              printButton.classList.remove("hidden");
            }
          },
          onPending: () => {
            toast.info("Menunggu pembayaran...");
          },
          onError: () => {
            toast.error("Pembayaran Midtrans gagal");
            toast.error("Silahkan Coba Ulangi Lagi Pembayaran-nya");
            // Update UI untuk menunjukkan pembayaran gagal
            const button = document.querySelector("[data-payment-button]");
            if (button) {
              button.classList.remove("bg-blue-500");
              button.classList.add("bg-red-500");
            }
          },
          onClose: () => {
            toast.info("Popup pembayaran ditutup");
          },
        });
      } else {
        toast.error(
          "Snap Midtrans tidak tersedia. Refresh halaman dan coba lagi."
        );
      }
    } catch (error: any) {
      toast.error(
        `Gagal memulai pembayaran Midtrans: ${
          error.message || "Terjadi kesalahan"
        }`
      );
      console.error("Midtrans payment error:", error);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Fungsi untuk mengecek status pembayaran
  const checkPaymentStatus = async (orderId: string) => {
    try {
      const response = await fetch(`/api/payments/midtrans/status/${orderId}`);
      const result = await response.json();

      if (result.status === "settlement" || result.status === "capture") {
        const updatedPayments = payments.map((payment) =>
          payment.midtransToken ? { ...payment, status: "SUCCESS" } : payment
        );
        setPayments(updatedPayments);

        // Update status pembayaran di database
        const updateResponse = await fetch(
          `/api/transactions/${transactionId}/payment-status`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              payments: updatedPayments,
              midtransTransactionId: result.transaction_id,
            }),
          }
        );

        if (!updateResponse.ok) {
          const errorData = await updateResponse.json();
          throw new Error(errorData.message);
        }

        if (updatedPayments.every((p) => p.status === "SUCCESS")) {
          setIsTransactionComplete(true);
          toast.success("Semua pembayaran berhasil!");
        }
      }
    } catch (error) {
      console.error("Error checking payment status:", error);
      toast.error("Gagal memperbarui status pembayaran");
    }
  };

  // Handler untuk mencetak struk
  const handlePrint = useReactToPrint({
    content: () => printReceiptRef.current,
    onAfterPrint: () => {
      toast.success("Struk berhasil dicetak");
      // Reset state untuk transaksi baru
      setCart([]);
      setSelectedCustomer(null);
      setNeedDelivery(false);
      setPayments([]);
      setIsTransactionComplete(false);
      generateNewTransactionId();
    },
  });

  // Handler untuk menyelesaikan transaksi tanpa cetak
  const handleCompleteWithoutPrint = () => {
    toast.success("Transaksi selesai");
    // Reset state untuk transaksi baru
    setCart([]);
    setSelectedCustomer(null);
    setNeedDelivery(false);
    setPayments([]);
    setIsTransactionComplete(false);
    generateNewTransactionId();
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Script Midtrans */}
      <Script
        src="https://app.sandbox.midtrans.com/snap/snap.js"
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY_SANDBOX}
        strategy="lazyOnload"
      />
      {/* Header & Informasi Sesi */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Point of Sale</CardTitle>
              <CardDescription>
                Kasir: {user?.fullName || "Loading..."} | Sesi: {sessionId} |
                {format(new Date(), "PPpp", { locale: id })}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={generateNewTransactionId}>
                <FilePlus2 className="mr-2 h-4 w-4" />
                Transaksi Baru
              </Button>
              <Button variant="outline" onClick={holdTransaction}>
                <PauseCircle className="mr-2 h-4 w-4" />
                Tahan Transaksi
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Panggil Transaksi
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Panggil Transaksi</DialogTitle>
                    <DialogDescription>
                      Pilih transaksi yang ingin dipanggil kembali
                    </DialogDescription>
                  </DialogHeader>
                  <ScrollArea className="h-[300px]">
                    {heldTransactions.length > 0 ? (
                      <div className="space-y-2">
                        {heldTransactions.map((transaction) => (
                          <div
                            key={transaction.id}
                            className="flex items-center justify-between p-2 hover:bg-accent rounded-lg cursor-pointer"
                            onClick={() => recallTransaction(transaction.id)}
                          >
                            <div>
                              <p className="font-medium">
                                {transaction.customer?.name || "Pelanggan Umum"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {transaction.cart.length} item
                              </p>
                            </div>
                            <p className="font-medium">
                              {new Intl.NumberFormat("id-ID", {
                                style: "currency",
                                currency: "IDR",
                              }).format(
                                transaction.cart.reduce(
                                  (acc, item) => acc + item.subtotal,
                                  0
                                ) + transaction.deliveryFee
                              )}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        Tidak ada transaksi yang ditahan
                      </div>
                    )}
                  </ScrollArea>
                </DialogContent>
              </Dialog>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-destructive">
                    <XCircle className="mr-2 h-4 w-4" />
                    Batalkan
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Batalkan Transaksi?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Semua item dalam keranjang akan dihapus. Tindakan ini
                      tidak dapat dibatalkan.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        setCart([]);
                        setSelectedCustomer(null);
                        setNeedDelivery(false);
                        generateNewTransactionId();
                      }}
                    >
                      Ya, Batalkan
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Area Pelanggan */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Badge variant={selectedCustomer ? "default" : "secondary"}>
                {selectedCustomer ? selectedCustomer.name : "Pelanggan Umum"}
              </Badge>
              {selectedCustomer?.points && (
                <Badge variant="outline">Poin: {selectedCustomer.points}</Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Users className="mr-2 h-4 w-4" />
                    Cari Pelanggan
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Pilih Pelanggan</DialogTitle>
                    <DialogDescription>
                      Cari pelanggan berdasarkan nama atau nomor telepon
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="Cari nama atau nomor telepon"
                      value={customerSearchQuery}
                      onChange={(e) => {
                        setCustomerSearchQuery(e.target.value);
                        searchCustomers(e.target.value);
                      }}
                    />
                    <ScrollArea className="h-[300px]">
                      {isSearchingCustomer ? (
                        <div className="flex items-center justify-center py-4">
                          <span className="text-muted-foreground">
                            Mencari pelanggan...
                          </span>
                        </div>
                      ) : customerSearchResults.length > 0 ? (
                        <div className="space-y-2">
                          {customerSearchResults.map((customer) => (
                            <div
                              key={customer.id}
                              className="flex items-center justify-between p-2 hover:bg-accent rounded-lg cursor-pointer"
                              onClick={() => {
                                setSelectedCustomer({
                                  id: customer.id,
                                  name: customer.nama,
                                  phone: customer.noTelp,
                                  points: customer.poinLoyalitas,
                                  address: customer.alamat,
                                });
                                setCustomerSearchQuery("");
                                setCustomerSearchResults([]);
                              }}
                            >
                              <div>
                                <p className="font-medium">{customer.nama}</p>
                                <p className="text-sm text-muted-foreground">
                                  {customer.noTelp}
                                </p>
                              </div>
                              {customer.poinLoyalitas > 0 && (
                                <Badge variant="outline">
                                  {customer.poinLoyalitas} Poin
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : customerSearchQuery ? (
                        <div className="text-center py-4 text-muted-foreground">
                          Tidak ada pelanggan yang ditemukan
                        </div>
                      ) : null}
                    </ScrollArea>
                  </div>
                </DialogContent>
              </Dialog>
              {selectedCustomer && (
                <Button
                  variant="outline"
                  onClick={() => setSelectedCustomer(null)}
                >
                  <UserX className="mr-2 h-4 w-4" />
                  Hapus Pelanggan
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Switch
              id="delivery"
              checked={needDelivery}
              onCheckedChange={setNeedDelivery}
            />
            <Label htmlFor="delivery">Perlu Diantar?</Label>
          </div>
          {needDelivery && (
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="delivery-address">Alamat Pengiriman</Label>
                <Input
                  id="delivery-address"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Masukkan alamat pengiriman"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="delivery-city">Kota Pengiriman</Label>
                <Input
                  id="delivery-city"
                  value={deliveryCity}
                  onChange={(e) => setDeliveryCity(e.target.value)}
                  placeholder="Masukkan kota pengiriman"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="delivery-postal-code">Kode Pos</Label>
                <Input
                  id="delivery-postal-code"
                  value={deliveryPostalCode}
                  onChange={(e) => setDeliveryPostalCode(e.target.value)}
                  placeholder="Masukkan kode pos"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="delivery-recipient-phone">
                  No. Telp Penerima
                </Label>
                <Input
                  id="delivery-recipient-phone"
                  value={deliveryRecipientPhone}
                  onChange={(e) => setDeliveryRecipientPhone(e.target.value)}
                  placeholder="Masukkan nomor telepon penerima"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="delivery-note">Catatan Pengiriman</Label>
                <Input
                  id="delivery-note"
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                  placeholder="Tambahkan catatan untuk kurir"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Area Input Barang & Keranjang */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Input Barang</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Scan Barcode / Cari Kode / Nama Barang"
              className="mb-4"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                searchItems(e.target.value);
              }}
            />
            <ScrollArea className="h-[300px]">
              {isSearching ? (
                <div className="flex items-center justify-center py-4">
                  <span className="text-muted-foreground">
                    Mencari barang...
                  </span>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 hover:bg-accent rounded-lg cursor-pointer"
                      onClick={() => addToCart(item)}
                    >
                      <div>
                        <p className="font-medium">{item.nama}</p>
                        <p className="text-sm text-muted-foreground">
                          Stok: {item.stok} {item.satuan || "Pcs"}
                        </p>
                      </div>
                      <p className="font-medium">
                        {new Intl.NumberFormat("id-ID", {
                          style: "currency",
                          currency: "IDR",
                          maximumFractionDigits: 0,
                        }).format(item.hargaJual)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : searchQuery ? (
                <div className="text-center py-4 text-muted-foreground">
                  Tidak ada barang yang ditemukan
                </div>
              ) : null}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Keranjang Belanja</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {cart.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No</TableHead>
                      <TableHead>Nama Barang</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Harga</TableHead>
                      <TableHead>Subtotal</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.quantity}
                            className="w-20"
                            min={1}
                            onChange={(e) =>
                              updateQuantity(item.id, parseInt(e.target.value))
                            }
                          />
                        </TableCell>
                        <TableCell>
                          {new Intl.NumberFormat("id-ID", {
                            style: "currency",
                            currency: "IDR",
                            maximumFractionDigits: 0,
                          }).format(item.price)}
                        </TableCell>
                        <TableCell>
                          {new Intl.NumberFormat("id-ID", {
                            style: "currency",
                            currency: "IDR",
                            maximumFractionDigits: 0,
                          }).format(item.subtotal)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => removeFromCart(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Keranjang belanja masih kosong.
                  <br />
                  Silakan scan atau cari barang.
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Area Pembayaran */}
      <Card>
        <CardHeader>
          <CardTitle>Pembayaran</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="discount">Diskon (%)</Label>
              <Input
                id="discount"
                type="number"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Number(e.target.value))}
                min="0"
                max="100"
                placeholder="0"
              />
            </div>
            {needDelivery && (
              <div className="space-y-2">
                <Label htmlFor="delivery-fee">Biaya Pengiriman (Rp)</Label>
                <Input
                  id="delivery-fee"
                  type="number"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(Number(e.target.value))}
                  placeholder="0"
                />
              </div>
            )}

            <div className="p-4 border rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <span>Subtotal</span>
                <span>
                  {new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                    maximumFractionDigits: 0,
                  }).format(getCalculationDetails().subtotal)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Diskon ({discountPercent}%)</span>
                <span className="text-red-500">
                  -
                  {new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                    maximumFractionDigits: 0,
                  }).format(getCalculationDetails().discountAmount)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>PPN ({taxPercent}%)</span>
                <span>
                  {new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                    maximumFractionDigits: 0,
                  }).format(getCalculationDetails().taxAmount)}
                </span>
              </div>
              {needDelivery && deliveryFee > 0 && (
                <div className="flex justify-between items-center">
                  <span>Biaya Pengiriman</span>
                  <span>
                    {new Intl.NumberFormat("id-ID", {
                      style: "currency",
                      currency: "IDR",
                      maximumFractionDigits: 0,
                    }).format(deliveryFee)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t">
                <span>Total</span>
                <span className="font-bold">
                  {new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                    maximumFractionDigits: 0,
                  }).format(calculateTotal())}
                </span>
              </div>
            </div>
          </div>

          <Tabs defaultValue="cash" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="cash">Tunai</TabsTrigger>
              <TabsTrigger value="debit_credit">Kartu Debit/Kredit</TabsTrigger>
              <TabsTrigger value="qris">QRIS</TabsTrigger>
              <TabsTrigger value="e_wallet">E-Wallet</TabsTrigger>
            </TabsList>

            {payments.map((payment, index) => (
              <div key={index} className="mb-4 p-4 border rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium">Pembayaran {index + 1}</h3>
                  {payment.status !== "SUCCESS" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => {
                        setPayments(payments.filter((_, i) => i !== index));
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <TabsContent value="cash">
                  <form onSubmit={handleSubmit(handleCashPayment)}>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Sisa yang Harus Dibayar</Label>
                        <Input
                          type="text"
                          value={new Intl.NumberFormat("id-ID", {
                            style: "currency",
                            currency: "IDR",
                            maximumFractionDigits: 0,
                          }).format(
                            calculateTotal() -
                              payments.reduce(
                                (sum, p) =>
                                  sum + (p.status === "SUCCESS" ? p.amount : 0),
                                0
                              )
                          )}
                          disabled
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cash-amount">
                          Jumlah Uang Diterima
                        </Label>
                        <Input
                          id="cash-amount"
                          type="number"
                          {...register("amount", { valueAsNumber: true })}
                          placeholder="Masukkan jumlah uang"
                          required
                        />
                      </div>
                      {errors.amount && (
                        <p className="text-sm text-destructive">
                          {errors.amount.message}
                        </p>
                      )}
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={
                          isProcessingPayment ||
                          payment.status === "SUCCESS" ||
                          cart.length === 0
                        }
                      >
                        {isProcessingPayment
                          ? "Memproses..."
                          : "Proses Pembayaran Tunai"}
                      </Button>
                    </div>
                  </form>
                </TabsContent>

                <TabsContent value="debit_credit">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Total Pembayaran</Label>
                      <Input
                        type="text"
                        value={new Intl.NumberFormat("id-ID", {
                          style: "currency",
                          currency: "IDR",
                          maximumFractionDigits: 0,
                        }).format(calculateTotal())}
                        disabled
                      />
                    </div>
                    <Button
                      onClick={() => handleMidtransPayment("DEBIT_CREDIT")}
                      className="w-full"
                      disabled={
                        isProcessingPayment ||
                        payment.status === "SUCCESS" ||
                        cart.length === 0
                      }
                    >
                      {isProcessingPayment
                        ? "Memproses..."
                        : "Bayar dengan Kartu (Midtrans)"}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      Pembayaran akan diproses melalui gateway Midtrans
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="qris">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Total Pembayaran</Label>
                      <Input
                        type="text"
                        value={new Intl.NumberFormat("id-ID", {
                          style: "currency",
                          currency: "IDR",
                          maximumFractionDigits: 0,
                        }).format(calculateTotal())}
                        disabled
                      />
                    </div>
                    <Button
                      onClick={() => handleMidtransPayment("QRIS")}
                      className="w-full"
                      disabled={
                        isProcessingPayment ||
                        payment.status === "SUCCESS" ||
                        cart.length === 0
                      }
                    >
                      {isProcessingPayment
                        ? "Memproses..."
                        : "Bayar dengan QRIS (Midtrans)"}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      Scan kode QR menggunakan aplikasi e-wallet atau mobile
                      banking
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="e_wallet">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Total Pembayaran</Label>
                      <Input
                        type="text"
                        value={new Intl.NumberFormat("id-ID", {
                          style: "currency",
                          currency: "IDR",
                          maximumFractionDigits: 0,
                        }).format(calculateTotal())}
                        disabled
                      />
                    </div>
                    <Button
                      onClick={() => handleMidtransPayment("E_WALLET")}
                      className="w-full bg-blue-500"
                      data-payment-button
                      disabled={
                        isProcessingPayment ||
                        payment.status === "SUCCESS" ||
                        cart.length === 0
                      }
                    >
                      {isProcessingPayment
                        ? "Memproses..."
                        : "Bayar dengan E-Wallet (Midtrans)"}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      Mendukung GoPay, OVO, DANA, LinkAja, dan ShopeePay
                    </p>
                  </div>
                </TabsContent>

                {payment.status === "SUCCESS" && (
                  <div className="mt-2 p-2 bg-green-50 text-green-700 rounded">
                    Pembayaran Berhasil
                  </div>
                )}
              </div>
            ))}

            {/* Tombol Tambah Pembayaran */}
            {payments.length < 2 && !isTransactionComplete && (
              <Button
                variant="outline"
                onClick={handleAddPayment}
                className="w-full mt-4"
              >
                + Tambah Cara Bayar Lain
              </Button>
            )}

            {/* Tombol Penyelesaian Transaksi */}
            {isTransactionComplete && (
              <div className="space-y-4 mt-6 border-t pt-4">
                <Button
                  className="w-full hidden"
                  data-print-button
                  onClick={handlePrint}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Transaksi Selesai & Cetak Struk
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleCompleteWithoutPrint}
                >
                  <Receipt className="mr-2 h-4 w-4" />
                  Transaksi Selesai (Tanpa Cetak)
                </Button>
              </div>
            )}
          </Tabs>
        </CardContent>
      </Card>

      {/* Komponen Struk untuk Cetak (Tersembunyi) */}
      <div style={{ display: "none" }}>
        <PrintReceipt
          ref={printReceiptRef}
          data={{
            id: transactionId,
            tanggal: new Date(),
            kasir: user?.fullName || "",
            pelanggan: selectedCustomer
              ? {
                  nama: selectedCustomer.name,
                  alamat: selectedCustomer.address,
                  telepon: selectedCustomer.phone,
                }
              : undefined,
            items: cart.map((item) => ({
              nama: item.name,
              harga: item.price,
              jumlah: item.quantity,
              diskon: item.discount,
              subtotal: item.subtotal,
            })),
            subtotal: cart.reduce((sum, item) => sum + item.subtotal, 0),
            diskonTransaksi: 0, // Sesuaikan dengan logika diskon
            biayaPengiriman: deliveryFee,
            pajak: 0, // Sesuaikan dengan logika pajak
            total: calculateTotal(),
            metodePembayaran: payments
              .filter((p) => p.status === "SUCCESS")
              .map((p) => p.method)
              .join(" & "),
            referensiPembayaran: payments.find((p) => p.midtransToken)
              ?.midtransToken,
          }}
        />
      </div>
    </div>
  );
}
