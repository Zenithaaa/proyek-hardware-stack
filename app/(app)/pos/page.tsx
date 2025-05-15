"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Barcode,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { initiateMidtransPayment } from "@/lib/actions/payment.actions";

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  sku: string;
}

interface CartItem extends Product {
  quantity: number;
  subtotal: number;
  discount: number;
}

export default function POSPage() {
  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState("cash");
  const [cashAmount, setCashAmount] = React.useState(0);
  const [showSearchCommand, setShowSearchCommand] = React.useState(false);

  // Dummy data untuk contoh
  const dummyProducts: Product[] = [
    { id: "1", name: "Palu", price: 50000, stock: 10, sku: "SKU001" },
    { id: "2", name: "Obeng", price: 25000, stock: 20, sku: "SKU002" },
    { id: "3", name: "Kunci Inggris", price: 75000, stock: 5, sku: "SKU003" },
  ];

  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const totalDiscount = cart.reduce((sum, item) => sum + item.discount, 0);
  const tax = subtotal * 0.11; // PPN 11%
  const grandTotal = subtotal - totalDiscount + tax;
  const change = cashAmount - grandTotal;

  const handleAddToCart = (product: Product) => {
    setCart((currentCart) => {
      const existingItem = currentCart.find((item) => item.id === product.id);
      if (existingItem) {
        return currentCart.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: (item.quantity + 1) * item.price,
              }
            : item
        );
      }
      return [
        ...currentCart,
        {
          ...product,
          quantity: 1,
          subtotal: product.price,
          discount: 0,
        },
      ];
    });
    setShowSearchCommand(false);
  };

  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity < 0) return;
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.id === productId
            ? {
                ...item,
                quantity: newQuantity,
                subtotal: newQuantity * item.price,
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((currentCart) =>
      currentCart.filter((item) => item.id !== productId)
    );
  };

  // ... state untuk order, items, grandTotal, dll. ...
  // Misal Anda punya idTransaksiInternal dari pembuatan order di DB Anda

  const { toast } = useToast();
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const handlePayWithMidtrans = async () => {
    setIsProcessingPayment(true);
    // Siapkan data order untuk dikirim ke Server Action
    const orderDataForMidtrans = {
      idTransaksiInternal: currentTransactionId, // ID unik transaksi dari sistem Anda
      grandTotal: currentGrandTotal,
      items: currentCartItems.map((item) => ({
        id: item.productId, // ID produk di sistem Anda
        price: item.price,
        quantity: item.quantity,
        name: item.productName,
      })),
      customer: selectedCustomer
        ? {
            // Ambil dari state pelanggan Anda
            first_name: selectedCustomer.name.split(" ")[0],
            last_name: selectedCustomer.name.split(" ").slice(1).join(" "),
            email: selectedCustomer.email,
            phone: selectedCustomer.phone,
          }
        : undefined,
      // Anda bisa membatasi metode pembayaran yang muncul di Snap
      enabledPayments: [
        "credit_card",
        "gopay",
        "shopeepay",
        "qris",
        "bca_va",
        "bni_va",
        "bri_va",
      ],
    };

    const result = await initiateMidtransPayment(orderDataForMidtrans);

    if (result.success && result.token) {
      // @ts-ignore // Memberitahu TypeScript bahwa window.snap ada
      window.snap.pay(result.token, {
        onSuccess: function (midtransResult: any) {
          /* Kasir/Pelanggan berhasil berinteraksi dengan Snap & Midtrans menerima pembayaran awal. */
          /* JANGAN anggap transaksi lunas di sini. Tunggu webhook! */
          console.log("Midtrans onSuccess:", midtransResult);
          toast({
            title: "Pembayaran Diproses",
            description: `Status: ${midtransResult.transaction_status}. Menunggu konfirmasi akhir.`,
          });
          // Anda bisa redirect ke halaman status order atau update UI
          // Contoh: router.push(`/order/${result.midtransOrderId}/status`);
          // Update status transaksi di UI POS Anda menjadi "Menunggu Konfirmasi"
        },
        onPending: function (midtransResult: any) {
          /* Pembayaran pending (misal, bayar via VA dan belum dibayar). */
          console.log("Midtrans onPending:", midtransResult);
          toast({
            title: "Pembayaran Pending",
            description: `Order ID: ${midtransResult.order_id}. Silakan selesaikan pembayaran.`,
          });
          // Tampilkan instruksi pembayaran atau redirect
        },
        onError: function (midtransResult: any) {
          /* Terjadi error saat proses pembayaran di Snap. */
          console.error("Midtrans onError:", midtransResult);
          toast({
            variant: "destructive",
            title: "Pembayaran Gagal",
            description: midtransResult.status_message || "Silakan coba lagi.",
          });
        },
        onClose: function () {
          /* Pelanggan menutup popup Snap tanpa menyelesaikan pembayaran. */
          console.log("Midtrans Snap closed");
          toast({
            title: "Pembayaran Dibatalkan",
            description: "Anda menutup jendela pembayaran.",
          });
        },
      });
    } else {
      toast({
        variant: "destructive",
        title: "Gagal Memulai Pembayaran",
        description: result.error || "Terjadi kesalahan.",
      });
    }
    setIsProcessingPayment(false);
  };

  // ... JSX Anda dengan tombol untuk memanggil handlePayWithMidtrans ...
  // <Button onClick={handlePayWithMidtrans} disabled={isProcessingPayment}>
  //   {isProcessingPayment ? "Memproses..." : "Bayar via Midtrans"}
  // </Button>

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4 p-6">
      {/* Area Pencarian & Penambahan Barang */}
      <div className="w-1/3 space-y-4">
        <div className="relative">
          <Input
            placeholder="Cari produk atau scan barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setShowSearchCommand(true)}
            className="w-full"
          />
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-8 top-0"
            onClick={() => setShowSearchCommand(true)}
          >
            <Search className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-0 top-0"
          >
            <Barcode className="h-4 w-4" />
          </Button>

          {showSearchCommand && (
            <Command className="absolute left-0 top-full z-10 mt-2 w-full rounded-lg border shadow-md">
              <CommandInput placeholder="Ketik nama produk atau SKU..." />
              <CommandList>
                <CommandEmpty>Tidak ada produk yang ditemukan.</CommandEmpty>
                <CommandGroup heading="Hasil Pencarian">
                  {dummyProducts
                    .filter(
                      (product) =>
                        product.name
                          .toLowerCase()
                          .includes(searchQuery.toLowerCase()) ||
                        product.sku
                          .toLowerCase()
                          .includes(searchQuery.toLowerCase())
                    )
                    .map((product) => (
                      <CommandItem
                        key={product.id}
                        onSelect={() => handleAddToCart(product)}
                      >
                        <div className="flex w-full items-center justify-between">
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {product.sku}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              {new Intl.NumberFormat("id-ID", {
                                style: "currency",
                                currency: "IDR",
                              }).format(product.price)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Stok: {product.stock}
                            </p>
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                </CommandGroup>
              </CommandList>
            </Command>
          )}
        </div>

        <div className="rounded-lg border p-4">
          <h2 className="mb-4 text-lg font-semibold">Transaksi Terakhir</h2>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Belum ada transaksi hari ini
            </p>
          </div>
        </div>
      </div>

      {/* Area Keranjang */}
      <div className="flex w-2/3 flex-col rounded-lg border">
        <div className="flex-1 overflow-auto p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produk</TableHead>
                <TableHead className="text-center">Jumlah</TableHead>
                <TableHead className="text-right">Harga</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cart.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    <div className="flex flex-col items-center py-8">
                      <ShoppingCart className="mb-2 h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        Keranjang masih kosong
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                cart.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.sku}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center space-x-2">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={() =>
                            handleUpdateQuantity(item.id, item.quantity - 1)
                          }
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-12 text-center">
                          {item.quantity}
                        </span>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={() =>
                            handleUpdateQuantity(item.id, item.quantity + 1)
                          }
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                      }).format(item.price)}
                    </TableCell>
                    <TableCell className="text-right">
                      {new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                      }).format(item.subtotal)}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => handleRemoveFromCart(item.id)}
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

        {/* Area Pembayaran */}
        <div className="border-t p-4">
          <div className="mb-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>
                {new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                }).format(subtotal)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Diskon</span>
              <span className="text-red-500">
                -
                {new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                }).format(totalDiscount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">PPN (11%)</span>
              <span>
                {new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                }).format(tax)}
              </span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>
                {new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                }).format(grandTotal)}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <RadioGroup
              value={paymentMethod}
              onValueChange={setPaymentMethod}
              className="grid grid-cols-3 gap-4"
            >
              <div>
                <RadioGroupItem
                  value="cash"
                  id="cash"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="cash"
                  className="flex cursor-pointer flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <span>Tunai</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem
                  value="debit"
                  id="debit"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="debit"
                  className="flex cursor-pointer flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <span>Debit</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem
                  value="qris"
                  id="qris"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="qris"
                  className="flex cursor-pointer flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <span>QRIS</span>
                </Label>
              </div>
            </RadioGroup>

            {paymentMethod === "cash" && (
              <div className="space-y-2">
                <Label htmlFor="cash-amount">Jumlah Tunai</Label>
                <Input
                  id="cash-amount"
                  type="number"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(Number(e.target.value))}
                  className="text-right"
                />
                <div className="flex justify-between">
                  <span>Kembalian</span>
                  <span
                    className={cn(
                      "font-medium",
                      change >= 0 ? "text-green-600" : "text-red-600"
                    )}
                  >
                    {new Intl.NumberFormat("id-ID", {
                      style: "currency",
                      currency: "IDR",
                    }).format(change)}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                className="w-full"
                size="lg"
                onClick={() => setCart([])}
                variant="outline"
              >
                Batal
              </Button>
              <Button
                className="w-full"
                size="lg"
                disabled={
                  cart.length === 0 ||
                  (paymentMethod === "cash" && cashAmount < grandTotal)
                }
              >
                Bayar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
