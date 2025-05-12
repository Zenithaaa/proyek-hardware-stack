"use client";

import * as React from "react";
import JsBarcode from "jsbarcode";

interface BarcodeGeneratorProps {
  value: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
}

export function generateRandomBarcode(): string {
  // Format: YYMMDDHHmmssXXX (Tahun-Bulan-Tanggal-Jam-Menit-Detik + 3 digit random)
  const now = new Date();
  const timestamp =
    now.getFullYear().toString().slice(-2) +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0") +
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0") +
    String(now.getSeconds()).padStart(2, "0");

  // Tambahkan 3 digit random
  const randomDigits = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");

  return `${timestamp}${randomDigits}`;
}

export function BarcodeGenerator({
  value,
  width = 2,
  height = 100,
  displayValue = true,
}: BarcodeGeneratorProps) {
  const barcodeRef = React.useRef<SVGSVGElement>(null);

  React.useEffect(() => {
    if (barcodeRef.current && value) {
      JsBarcode(barcodeRef.current, value, {
        width,
        height,
        displayValue,
        margin: 10,
        background: "#ffffff",
        lineColor: "#000000",
        fontSize: 16,
        font: "system-ui",
      });
    }
  }, [value, width, height, displayValue]);

  if (!value) return null;

  return <svg ref={barcodeRef} />;
}
