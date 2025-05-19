// app/api/transactions/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createTransaction } from "@/lib/actions/transaction.actions";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      userId,
      pelangganId,
      cart,
      needDelivery,
      deliveryAddress,
      deliveryCity,
      deliveryPostalCode,
      deliveryRecipientPhone,
      deliveryNote,
      deliveryFee,
      sesiKasirId,
      payments,
    } = body;

    // Validasi input
    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return NextResponse.json(
        { error: "Keranjang belanja kosong" },
        { status: 400 }
      );
    }

    // Buat transaksi menggunakan server action
    const result = await createTransaction({
      userId,
      pelangganId,
      cart,
      needDelivery,
      deliveryAddress,
      deliveryCity,
      deliveryPostalCode,
      deliveryRecipientPhone,
      deliveryNote,
      deliveryFee,
      sesiKasirId,
      payments,
      discountPercent: body.discountPercent, // Tambahkan discountPercent
      taxPercent: body.taxPercent, // Tambahkan taxPercent
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Gagal membuat transaksi" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Transaksi berhasil dibuat",
      data: result.data,
    });
  } catch (error: any) {
    console.error("Error creating transaction:", error);
    return NextResponse.json(
      { error: error.message || "Gagal membuat transaksi" },
      { status: 500 }
    );
  }
}
