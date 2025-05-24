"use client";

import { useEffect, useState, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";
import Script from "next/script";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

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
  amount: z
    .union([
      z.string().transform((val) => {
        if (typeof val !== "string") return 0; // Tambahkan pemeriksaan tipe
        // Hapus semua titik dan konversi ke number
        const numericValue = Number(val.replace(/\./g, ""));
        return isNaN(numericValue) ? 0 : numericValue;
      }),
      z.number(),
    ])
    .refine((val) => val >= 0, {
      message: "Jumlah tidak boleh negatif",
    }),
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
  const [taxPercent, setTaxPercent] = useState(0); // Inisialis PPN dengan 0%
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

  // Fungsi untuk mencetak alamat pengiriman sebagai PDF
  const printShippingAddress = () => {
    try {
      // Validasi data pengiriman
      if (!deliveryAddress || !deliveryCity) {
        toast.error("Alamat dan kota pengiriman harus diisi");
        return;
      }

      // Buat dokumen PDF
      const doc = new jsPDF();

      // Tambahkan judul
      doc.setFontSize(16);
      doc.text("ALAMAT PENGIRIMAN", 105, 20, { align: "center" });

      // Tambahkan informasi pelanggan jika ada
      if (selectedCustomer) {
        doc.setFontSize(12);
        doc.text(`Pelanggan: ${selectedCustomer.name}`, 20, 35);
      }

      // Tambahkan informasi pengiriman
      doc.setFontSize(14);
      doc.text("Detail Pengiriman:", 20, 45);

      // Buat tabel informasi pengiriman
      const tableData = [
        ["Alamat", deliveryAddress],
        ["Kota", deliveryCity],
        ["Kode Pos", deliveryPostalCode || "-"],
        ["No. Telp Penerima", deliveryRecipientPhone || "-"],
        ["Catatan", deliveryNote || "-"],
      ];

      // Posisi Y awal untuk teks setelah tabel
      let finalY = 50;

      autoTable(doc, {
        startY: 50,
        head: [],
        body: tableData,
        theme: "plain",
        styles: { fontSize: 12 },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 40 },
          1: { cellWidth: 150 },
        },
        didDrawPage: (data) => {
          // Simpan posisi Y akhir dari tabel
          finalY = data.cursor.y;
        },
      });

      // Tambahkan tanggal dan ID transaksi
      const currentDate = format(new Date(), "dd MMMM yyyy, HH:mm", {
        locale: id,
      });
      doc.setFontSize(10);

      // Gunakan finalY yang sudah disimpan, atau gunakan nilai default jika tidak tersedia
      // Tambahkan margin 15 untuk jarak dari tabel
      doc.text(`Dicetak pada: ${currentDate}`, 20, finalY + 15);
      doc.text(`ID Transaksi: ${transactionId}`, 20, finalY + 25);

      // Buka PDF di tab baru dan cetak
      window.open(URL.createObjectURL(doc.output("blob")));
      toast.success("PDF alamat pengiriman berhasil dibuat");
    } catch (error) {
      console.error("Error printing shipping address:", error);
      toast.error("Gagal mencetak alamat pengiriman");
    }
  };

  const resetTransactionState = () => {
    setCart([]);
    setSelectedCustomer(null);
    setNeedDelivery(false);
    setDeliveryAddress("");
    setDeliveryCity("");
    setDeliveryPostalCode("");
    setDeliveryRecipientPhone("");
    setDeliveryNote("");
    setDeliveryFee(0);
    setDiscountPercent(0);
    setTaxPercent(0);
    setPayments([]);
    setIsTransactionComplete(false);
    setTransactionDetails(null);
    setCashAmount(0);
    setChangeAmount(0);

    localStorage.removeItem("pos_cart");
    localStorage.removeItem("pos_customer");
    localStorage.removeItem("pos_delivery");
    localStorage.removeItem("pos_payments");
    // sessionId and transactionId are handled by generateNewTransactionId()
    generateNewTransactionId();
  };

  // Fungsi untuk pembayaran tunai
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(paymentSchema),
  });

  useEffect(() => {
    // Coba memuat data dari localStorage saat komponen dimuat
    const loadSavedState = () => {
      try {
        const savedCart = localStorage.getItem("pos_cart");
        const savedCustomer = localStorage.getItem("pos_customer");
        const savedDelivery = localStorage.getItem("pos_delivery");
        const savedPayments = localStorage.getItem("pos_payments");
        const savedSessionId = localStorage.getItem("pos_session_id");
        const savedTransactionId = localStorage.getItem("pos_transaction_id");
        const savedHeldTransactions = localStorage.getItem(
          "pos_held_transactions"
        ); // Muat transaksi tertahan

        if (savedCart) setCart(JSON.parse(savedCart));
        if (savedCustomer) setSelectedCustomer(JSON.parse(savedCustomer));
        if (savedDelivery) {
          const deliveryData = JSON.parse(savedDelivery);
          setNeedDelivery(deliveryData.needDelivery);
          setDeliveryAddress(deliveryData.address);
          setDeliveryCity(deliveryData.city);
          setDeliveryPostalCode(deliveryData.postalCode);
          setDeliveryRecipientPhone(deliveryData.recipientPhone);
          setDeliveryNote(deliveryData.note);
          setDeliveryFee(deliveryData.fee);
        }
        if (savedPayments) setPayments(JSON.parse(savedPayments));
        if (savedSessionId) setSessionId(savedSessionId);
        if (savedTransactionId) {
          setTransactionId(savedTransactionId);
        } else {
          generateNewTransactionId();
        }
        if (savedHeldTransactions)
          setHeldTransactions(JSON.parse(savedHeldTransactions)); // Set transaksi tertahan
      } catch (error) {
        console.error("Error loading saved state:", error);
        // Jika terjadi error saat memuat data, generate ID transaksi baru
        generateNewTransactionId();

        // Jika ada data di cart, simpan ke transaksi tertahan
        if (cart.length > 0) {
          holdTransaction();
        }
      }
    };

    loadSavedState();

    // Muat daftar barang saat komponen dimuat
    fetchAllItems();
  }, []);

  const generateNewTransactionId = async () => {
    try {
      if (user?.id) {
        const response = await fetch("/api/cashier-sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            modalAwal: 0,
            catatanSesi: "Sesi dibuat saat memulai transaksi baru",
          }),
        });

        const result = await response.json();
        if (response.ok) {
          setSessionId(result.data.id);
          const newTransactionId = `TRX_${Date.now()}`;
          setTransactionId(newTransactionId);
          toast.success("Sesi kasir berhasil dibuat");
        } else {
          toast.error("Gagal membuat sesi kasir: " + result.error);
        }
      } else {
        toast.error("User ID tidak tersedia");
      }
    } catch (error) {
      console.error("Error creating cashier session:", error);
      toast.error("Gagal membuat sesi kasir");
    }
  };

  // Efek untuk menyimpan perubahan state ke localStorage
  useEffect(() => {
    saveStateToLocalStorage();
  }, [
    cart,
    selectedCustomer,
    needDelivery,
    deliveryAddress,
    deliveryCity,
    deliveryPostalCode,
    deliveryRecipientPhone,
    deliveryNote,
    deliveryFee,
    payments,
    sessionId,
    transactionId,
  ]);

  // Fungsi untuk menghitung total belanja
  const calculateTotal = () => {
    // Pastikan semua nilai adalah numerik
    const subtotal = cart.reduce(
      (acc, item) => Number(acc) + Number(item.subtotal),
      0
    );
    const discountAmount = (Number(subtotal) * Number(discountPercent)) / 100;
    const afterDiscount = Number(subtotal) - Number(discountAmount);
    const taxAmount = (Number(afterDiscount) * Number(taxPercent)) / 100;
    return Number(afterDiscount) + Number(taxAmount) + Number(deliveryFee);
  };

  // Fungsi untuk mendapatkan rincian perhitungan
  const handleDeliveryToggle = (checked: boolean) => {
    setNeedDelivery(checked);
    if (!checked) {
      // Reset semua field pengiriman saat switch dinonaktifkan
      setDeliveryAddress("");
      setDeliveryCity("");
      setDeliveryPostalCode("");
      setDeliveryRecipientPhone("");
      setDeliveryNote("");
      setDeliveryFee(0);
    }
  };
  const getCalculationDetails = () => {
    // Pastikan semua nilai adalah numerik
    const subtotal = cart.reduce(
      (acc, item) => Number(acc) + Number(item.subtotal),
      0
    );
    const discountAmount = (Number(subtotal) * Number(discountPercent)) / 100;
    const afterDiscount = Number(subtotal) - Number(discountAmount);
    const taxAmount = (Number(afterDiscount) * Number(taxPercent)) / 100;
    return {
      subtotal: Number(subtotal),
      discountAmount: Number(discountAmount),
      afterDiscount: Number(afterDiscount),
      taxAmount: Number(taxAmount),
      deliveryFee: Number(deliveryFee),
      total: Number(afterDiscount) + Number(taxAmount) + Number(deliveryFee),
    };
  };

  // State untuk daftar semua barang dan pagination
  const [allItems, setAllItems] = useState<any[]>([]);
  const [isLoadingAllItems, setIsLoadingAllItems] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  // Fungsi untuk mengambil semua barang
  const fetchAllItems = async (page = 1) => {
    setIsLoadingAllItems(true);
    try {
      const response = await fetch(
        `/api/items/all?page=${page}&limit=${itemsPerPage}`
      );
      const data = await response.json();
      setAllItems(data.items);
      setTotalPages(data.pagination.totalPages);
      setCurrentPage(data.pagination.page);
    } catch (error) {
      toast.error("Gagal memuat daftar barang");
      console.error(error);
    } finally {
      setIsLoadingAllItems(false);
    }
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

  // Fungsi untuk mengubah halaman
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      fetchAllItems(newPage);
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

  // Fungsi untuk menyimpan state ke localStorage
  const saveStateToLocalStorage = () => {
    try {
      localStorage.setItem("pos_cart", JSON.stringify(cart));
      localStorage.setItem("pos_customer", JSON.stringify(selectedCustomer));
      localStorage.setItem(
        "pos_delivery",
        JSON.stringify({
          needDelivery,
          address: deliveryAddress,
          city: deliveryCity,
          postalCode: deliveryPostalCode,
          recipientPhone: deliveryRecipientPhone,
          note: deliveryNote,
          fee: deliveryFee,
        })
      );
      localStorage.setItem("pos_payments", JSON.stringify(payments));
      localStorage.setItem("pos_session_id", sessionId);
      localStorage.setItem("pos_transaction_id", transactionId);
      localStorage.setItem(
        "pos_held_transactions",
        JSON.stringify(heldTransactions)
      ); // Simpan transaksi tertahan
    } catch (error) {
      console.error("Error saving state:", error);
    }
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
        total: getCalculationDetails().total, // Simpan total transaksi
        discountPercent: discountPercent, // Simpan persentase diskon
        taxPercent: taxPercent, // Simpan persentase pajak
      },
    ]);
    // Hapus data dari localStorage saat transaksi ditahan
    localStorage.removeItem("pos_cart");
    localStorage.removeItem("pos_customer");
    localStorage.removeItem("pos_delivery");
    localStorage.removeItem("pos_payments");
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
  const handleAddPayment = async () => {
    if (payments.length >= 2) {
      toast.error("Maksimal 2 metode pembayaran");
      return;
    }

    // Buat sesi kasir jika belum ada
    if (!sessionId || sessionId.startsWith("SESSION_")) {
      try {
        if (user?.id) {
          const response = await fetch("/api/cashier-sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: user.id,
              modalAwal: 0,
              catatanSesi: "Sesi dibuat saat memulai transaksi baru",
            }),
          });

          const result = await response.json();
          if (response.ok) {
            setSessionId(result.data.id);
            toast.success("Sesi kasir berhasil dibuat");
          } else {
            toast.error("Gagal membuat sesi kasir: " + result.error);
            return;
          }
        } else {
          toast.error("User ID tidak tersedia");
          return;
        }
      } catch (error) {
        console.error("Error creating cashier session:", error);
        toast.error("Gagal membuat sesi kasir");
        return;
      }
    }

    setPayments([
      ...payments,
      { method: "CASH", amount: 0, status: "PENDING" },
    ]);
  };

  // State untuk dialog konfirmasi pembayaran berhasil
  const [showPaymentSuccessDialog, setShowPaymentSuccessDialog] =
    useState(false);
  const [transactionDetails, setTransactionDetails] = useState<any>(null);
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [changeAmount, setChangeAmount] = useState<number>(0);
  const [inputCashAmount, setInputCashAmount] = useState<number>(0);

  // Handler untuk pembayaran tunai
  const handleCashPayment = async (data: any) => {
    setIsProcessingPayment(true);
    toast.loading("Memproses pembayaran...");
    try {
      // Validasi data pembayaran
      if (!cart || cart.length === 0) {
        throw new Error("Keranjang belanja kosong");
      }

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
          toast.dismiss();
          toast.error("Gagal membuat sesi kasir. Silakan coba lagi.");
          setIsProcessingPayment(false);
          return;
        }
      }

      // Proses pembayaran tunai - pastikan nilai amount adalah numerik
      const cashAmount =
        typeof data.amount === "string"
          ? Number(data.amount.replace(/\./g, ""))
          : Number(data.amount);

      // Validasi nilai numerik untuk mencegah overflow
      const MAX_NUMERIC_VALUE = 9999999999999.99; // Batas maksimum untuk field dengan precision 15, scale 2
      const validCashAmount = Math.min(cashAmount, MAX_NUMERIC_VALUE);

      const updatedPayments = payments.map((payment) =>
        payment.method === "CASH"
          ? { ...payment, amount: validCashAmount, status: "SUCCESS" }
          : payment
      );
      setPayments(updatedPayments);
      setCashAmount(validCashAmount);

      // Hitung kembalian
      const totalAmount = calculateTotal();
      const paidAmount = updatedPayments.reduce(
        (sum, p) => sum + (p.status === "SUCCESS" ? Number(p.amount) : 0),
        0
      );
      setChangeAmount(paidAmount - totalAmount);

      if (updatedPayments.every((p) => p.status === "SUCCESS")) {
        // Validasi nilai numerik untuk mencegah overflow
        const MAX_NUMERIC_VALUE = 9999999999999.99; // Batas maksimum untuk field dengan precision 15, scale 2

        // Validasi cart items
        const validatedCart = cart.map((item) => ({
          ...item,
          price: Math.min(Number(item.price), MAX_NUMERIC_VALUE),
          subtotal: Math.min(Number(item.subtotal), MAX_NUMERIC_VALUE),
          discount: Math.min(Number(item.discount), MAX_NUMERIC_VALUE),
        }));

        // Validasi deliveryFee
        const validDeliveryFee = Math.min(
          Number(deliveryFee),
          MAX_NUMERIC_VALUE
        );

        // Validasi payments
        const validatedPayments = updatedPayments.map((payment) => ({
          ...payment,
          amount: Math.min(Number(payment.amount), MAX_NUMERIC_VALUE),
        }));

        // Simpan transaksi ke database
        const response = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user?.id,
            pelangganId: selectedCustomer?.id,
            cart: validatedCart,
            needDelivery,
            deliveryAddress,
            deliveryCity,
            deliveryPostalCode,
            deliveryRecipientPhone,
            deliveryNote,
            deliveryFee: validDeliveryFee,
            sesiKasirId: sessionId, // Sekarang sessionId sudah valid
            payments: validatedPayments,
            discountPercent: Math.min(Number(discountPercent), 100), // Tambahkan informasi diskon
            taxPercent: Math.min(Number(taxPercent), 100), // Tambahkan informasi pajak
          }),
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(
            result.error || result.message || "Gagal menyimpan transaksi"
          );
        }

        setIsTransactionComplete(true);
        toast.dismiss();
        toast.success("Pembayaran berhasil!");

        // Simpan detail transaksi untuk ditampilkan di dialog
        setTransactionDetails({
          id: result.data.nomorStruk,
          date: new Date(),
          total: totalAmount,
          deliveryFee: validDeliveryFee,
          paymentMethod: "Tunai",
          status: "Berhasil",
        });

        // Tampilkan dialog konfirmasi pembayaran berhasil
        setShowPaymentSuccessDialog(true);

        // Siapkan data untuk cetak struk
        const receiptData = {
          id: result.data.nomorStruk,
          tanggal: new Date(),
          kasir: user?.fullName || "Kasir",
          pelanggan: selectedCustomer
            ? {
                nama: selectedCustomer.name,
                alamat: selectedCustomer.address,
                telepon: selectedCustomer.phone,
              }
            : undefined,
          items: validatedCart.map((item) => ({
            nama: item.name,
            harga: item.price,
            jumlah: item.quantity,
            diskon: item.discount,
            subtotal: item.subtotal,
          })),
          subtotal: Math.min(
            getCalculationDetails().subtotal,
            MAX_NUMERIC_VALUE
          ),
          diskonTransaksi: Math.min(
            getCalculationDetails().discountAmount,
            MAX_NUMERIC_VALUE
          ),
          biayaPengiriman: validDeliveryFee,
          pajak: Math.min(getCalculationDetails().taxAmount, MAX_NUMERIC_VALUE),
          total: Math.min(getCalculationDetails().total, MAX_NUMERIC_VALUE),
          metodePembayaran: "Tunai",
          referensiPembayaran: "",
        };
      }
    } catch (error: any) {
      console.error("Error processing cash payment:", error);
      toast.dismiss();
      toast.error(
        `Gagal memproses pembayaran tunai: ${
          error.message || "Terjadi kesalahan"
        }`
      );
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Handler untuk menyelesaikan transaksi
  const handleFinishTransaction = (withPrint: boolean = false) => {
    if (withPrint) {
      if (printReceiptRef.current && transactionDetails) {
      } else {
        toast.error(
          "Gagal menyiapkan struk untuk dicetak. Data transaksi tidak lengkap atau referensi cetak tidak ditemukan."
        );
        // Fallback: if printing can't even start, reset and close dialog
        setShowPaymentSuccessDialog(false); // Close dialog
        resetTransactionState(); // Reset state
        toast.success("Transaksi selesai (proses cetak gagal dimulai)."); // Inform user
      }
    } else {
      // "Selesai" button without printing
      setShowPaymentSuccessDialog(false); // Close dialog
      resetTransactionState(); // Reset state
      toast.success("Transaksi selesai!"); // Inform user
    }
  };

  // Dialog konfirmasi pembayaran berhasil
  const PaymentSuccessDialog = () => (
    <Dialog
      open={showPaymentSuccessDialog}
      onOpenChange={setShowPaymentSuccessDialog}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pembayaran Berhasil</DialogTitle>
          <DialogDescription>
            Transaksi telah berhasil diproses
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="text-muted-foreground">No. Transaksi :</div>
            <div className="font-medium">{transactionDetails?.id}</div>

            <div className="text-muted-foreground">Tanggal :</div>
            <div className="font-medium">
              {transactionDetails?.date &&
                format(transactionDetails.date, "dd MMMM yyyy, HH:mm", {
                  locale: id,
                })}
            </div>

            <div className="text-muted-foreground">Total :</div>
            <div className="font-medium">
              {transactionDetails?.total &&
                new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  maximumFractionDigits: 0,
                }).format(transactionDetails.total)}
            </div>

            <div className="text-muted-foreground">Metode Pembayaran :</div>
            <div className="font-medium">
              {transactionDetails?.paymentMethod}
            </div>

            <div className="text-muted-foreground">Dibayar :</div>
            <div className="font-medium">
              {cashAmount &&
                new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  maximumFractionDigits: 0,
                }).format(cashAmount)}
            </div>

            <div className="text-muted-foreground">Kembalian :</div>
            <div className="font-medium">
              {changeAmount &&
                new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  maximumFractionDigits: 0,
                }).format(changeAmount)}
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            className="w-full sm:w-auto"
            onClick={() => handleFinishTransaction(false)}
          >
            Selesai
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Handler untuk pembayaran Midtrans (dinonaktifkan)
  const handleMidtransPayment = async (method: PaymentMethod) => {
    toast.info("Pembayaran " + method + " akan segera hadir!");
    return;
    // Kode di bawah ini dinonaktifkan sementara
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
          <div className="flex flex-col space-y-4">
            <div>
              <CardTitle>Point of Sale</CardTitle>
              <CardDescription>
                Sesi: {sessionId ? `#${sessionId}` : "-"} |{" "}
                {format(new Date(), "dd MMMM yyyy, HH.mm", { locale: id })}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                className="w-full sm:w-auto"
                variant="outline"
                onClick={generateNewTransactionId}
              >
                <FilePlus2 className="mr-2 h-4 w-4" />
                Transaksi Baru
              </Button>
              <Button
                className="w-full sm:w-auto"
                variant="outline"
                onClick={holdTransaction}
              >
                <PauseCircle className="mr-2 h-4 w-4" />
                Tahan Transaksi
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto" variant="outline">
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
                  <ScrollArea className="h-[300px] overflow-x-auto overflow-y-auto">
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
                                maximumFractionDigits: 0,
                              }).format(
                                transaction.total // Menggunakan total yang disimpan
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
                  <Button
                    variant="outline"
                    className="text-destructive w-full sm:w-auto"
                  >
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <Badge variant={selectedCustomer ? "default" : "secondary"}>
                {selectedCustomer ? selectedCustomer.name : "Pelanggan Umum"}
              </Badge>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto">
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
                    <ScrollArea className="h-[300px] overflow-x-auto overflow-y-auto">
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
                  className="w-full sm:w-auto"
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
              <div className="mt-4">
                <Button
                  type="submit"
                  className="w-full"
                  onClick={() => printShippingAddress()}
                  disabled={!deliveryAddress || !deliveryCity}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Cetak Alamat Pengiriman
                </Button>
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
              placeholder="Cari Kode / Nama Barang"
              className="mb-4"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                searchItems(e.target.value);
              }}
            />
            {/* Tampilan hasil pencarian */}
            {searchQuery ? (
              <div className="h-[300px] overflow-x-auto overflow-y-auto">
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
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    Tidak ada barang yang ditemukan
                  </div>
                )}
              </div>
            ) : (
              /* Tampilan Grid Barang */
              <div className="mt-2">
                <div className="max-h-[400px] overflow-y-auto border rounded-md">
                  {isLoadingAllItems ? (
                    <div className="flex items-center justify-center py-8">
                      <span className="text-muted-foreground">
                        Memuat daftar barang...
                      </span>
                    </div>
                  ) : allItems.length > 0 ? (
                    <div className="divide-y divide-border">
                      {allItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 hover:bg-accent rounded-sm cursor-pointer"
                          onClick={() => addToCart(item)}
                        >
                          <div>
                            <p className="font-medium">{item.nama}</p>
                            <p className="text-sm text-muted-foreground">
                              Stok: {item.stok} {item.satuan || "Pcs"}
                            </p>
                          </div>
                          <p className="font-medium">
                            {formatCurrency(item.hargaJual)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Tidak ada barang yang tersedia
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Keranjang Belanja</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto overflow-y-auto rounded-md border">
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
                  Silakan cari kode atau cari nama barang.
                </div>
              )}
            </div>
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
                onChange={(e) =>
                  setDiscountPercent(Math.min(Number(e.target.value), 100))
                }
                min="0"
                max="100"
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ppn">PPN (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={taxPercent}
                onChange={(e) =>
                  setTaxPercent(Math.min(Number(e.target.value), 100))
                }
              />
            </div>
            {needDelivery && (
              <div className="space-y-2">
                <Label htmlFor="delivery-fee">Biaya Pengiriman (Rp)</Label>
                <Input
                  id="delivery-fee"
                  type="text"
                  value={deliveryFee.toLocaleString()}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    setDeliveryFee(Number(value));
                  }}
                  className="text-left"
                />
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>Rp {getCalculationDetails().subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-red-500">
            <span>Diskon ({discountPercent}%)</span>
            <span>
              -Rp {getCalculationDetails().discountAmount.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span>PPN ({taxPercent}%)</span>
            <span>Rp {getCalculationDetails().taxAmount.toLocaleString()}</span>
          </div>
          {needDelivery && (
            <div className="flex justify-between">
              <span>Biaya Pengiriman</span>
              <span>
                Rp {getCalculationDetails().deliveryFee.toLocaleString()}
              </span>
            </div>
          )}
          <div className="flex justify-between font-bold space-y-2">
            <span>Total</span>
            <span>Rp {getCalculationDetails().total.toLocaleString()}</span>
          </div>
          <Tabs defaultValue="cash" className="w-full grid-cols-2">
            <TabsList className="grid w-full grid-cols-1 lg:grid-cols-4 gap-1">
              <TabsTrigger value="cash">Tunai</TabsTrigger>
              <TabsTrigger
                value="debit_credit"
                disabled
                className="hidden lg:flex"
              >
                Kartu Debit/Kredit
                <Badge variant="outline" className="ml-2 hidden sm:inline-flex">
                  Segera Hadir
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="qris" disabled className="hidden lg:flex">
                QRIS
                <Badge variant="outline" className="ml-2 hidden sm:inline-flex">
                  Segera Hadir
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="e_wallet" disabled className="hidden lg:flex">
                E-Wallet
                <Badge variant="outline" className="ml-2 hidden sm:inline-flex">
                  Segera Hadir
                </Badge>
              </TabsTrigger>
            </TabsList>

            {payments.map((payment, index) => (
              <div key={index} className="mb-4 p-4 border rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium">Pembayaran</h3>
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
                      <input
                        type="hidden"
                        {...register("method")}
                        value="CASH"
                      />
                      <div className="space-y-2">
                        <Label>Total Pembayaran</Label>
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
                                  sum +
                                  (p.status === "SUCCESS"
                                    ? Number(p.amount)
                                    : 0),
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
                          type="text"
                          {...register("amount", {
                            setValueAs: (value) => {
                              // Tambahkan pemeriksaan tipe sebelum memanggil replace
                              if (typeof value !== "string") return value; // Kembalikan nilai asli jika bukan string
                              // Hapus semua titik dan konversi ke number
                              const numericValue = Number(
                                value.replace(/\./g, "")
                              );
                              return isNaN(numericValue) ? 0 : numericValue;
                            },
                          })}
                          placeholder="Masukkan jumlah uang"
                          required
                          onChange={(e) => {
                            // Hapus semua karakter non-digit
                            let value = e.target.value.replace(/\D/g, "");
                            // Format dengan titik sebagai pemisah ribuan
                            if (value) {
                              value = Number(value)
                                .toLocaleString("id-ID")
                                .replace(/,/g, ".");
                              // Update state dengan nilai numerik untuk validasi tombol
                              setInputCashAmount(
                                Number(value.replace(/\./g, ""))
                              );
                            } else {
                              setInputCashAmount(0);
                            }
                            e.target.value = value;
                          }}
                        />
                      </div>
                      {errors.amount && (
                        <p className="text-sm text-destructive">
                          {errors.amount.message}
                        </p>
                      )}
                      <div className="space-y-2">
                        {payment.status === "SUCCESS" && (
                          <div className="text-sm">
                            <Label>Kembalian</Label>
                            <div className="font-bold text-green-600">
                              {formatCurrency(changeAmount)}
                            </div>
                          </div>
                        )}
                        <Button
                          type="submit"
                          className="w-full"
                          disabled={
                            isProcessingPayment ||
                            payment.status === "SUCCESS" ||
                            cart.length === 0 ||
                            // Memeriksa apakah jumlah uang yang diterima kurang dari total pembayaran
                            inputCashAmount < calculateTotal()
                          }
                        >
                          {isProcessingPayment
                            ? "Memproses..."
                            : payment.status === "SUCCESS"
                            ? "Pembayaran Berhasil"
                            : "Proses Pembayaran Tunai"}
                        </Button>
                        {payment.status === "SUCCESS" && (
                          <div className="grid gap-2 mt-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => handleFinishTransaction(false)}
                            >
                              Transaksi Selesai
                            </Button>
                          </div>
                        )}
                      </div>
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
            {payments.length === 0 && !isTransactionComplete && (
              <Button
                variant="outline"
                onClick={handleAddPayment}
                className="w-full mt-4"
              >
                + {payments.length === 0 ? "Bayar" : "Tambah Cara Bayar Lain"}
              </Button>
            )}

            {/* Tombol Penyelesaian Transaksi */}
            {isTransactionComplete && (
              <div className="space-y-4 mt-6 border-t pt-4">
                <Button className="w-full hidden">
                  <Printer className="mr-2 h-4 w-4" />
                  Transaksi Selesai & Cetak Struk
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleCompleteWithoutPrint}
                >
                  Transaksi Selesai
                </Button>
              </div>
            )}
          </Tabs>
        </CardContent>
      </Card>
      {/* Dialog konfirmasi pembayaran berhasil */}
      <Dialog
        open={showPaymentSuccessDialog}
        onOpenChange={setShowPaymentSuccessDialog}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pembayaran Berhasil</DialogTitle>
            <DialogDescription>
              Transaksi telah berhasil diproses
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="text-muted-foreground">No. Transaksi :</div>
              <div className="font-medium">{transactionDetails?.id}</div>

              <div className="text-muted-foreground">Tanggal :</div>
              <div className="font-medium">
                {transactionDetails?.date &&
                  format(transactionDetails.date, "dd MMMM yyyy, HH:mm", {
                    locale: id,
                  })}
              </div>

              <div className="text-muted-foreground">Total :</div>
              <div className="font-medium">
                {transactionDetails?.total &&
                  new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                    maximumFractionDigits: 0,
                  }).format(transactionDetails.total)}
              </div>

              <div className="text-muted-foreground">Metode Pembayaran :</div>
              <div className="font-medium">
                {transactionDetails?.paymentMethod}
              </div>

              <div className="text-muted-foreground">Dibayar :</div>
              <div className="font-medium">
                {cashAmount &&
                  new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                    maximumFractionDigits: 0,
                  }).format(cashAmount)}
              </div>

              <div className="text-muted-foreground">Kembalian :</div>
              <div className="font-medium">
                {changeAmount &&
                  new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                    maximumFractionDigits: 0,
                  }).format(changeAmount)}
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              className="w-full sm:w-auto"
              onClick={() => handleFinishTransaction(false)}
            >
              Selesai
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Fungsi untuk memformat mata uang
const formatCurrency = (amount: number | bigint | null | undefined) => {
  if (amount === null || amount === undefined) {
    amount = 0;
  }
  const numericAmount = typeof amount === "bigint" ? Number(amount) : amount;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numericAmount);
};
