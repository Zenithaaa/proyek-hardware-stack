"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

type Item = {
  id: number;
  nama: string;
  hargaJual: number;
  stok: number;
  kodeBarcode?: string | null;
};

type ItemSearchProps = {
  onItemSelect: (item: Item) => void;
};

export default function ItemSearch({ onItemSelect }: ItemSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/items/search?q=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error("Error searching items:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBarcodeScanned = async (barcode: string) => {
    try {
      const response = await fetch(`/api/items/barcode/${barcode}`);
      const data = await response.json();
      if (data) {
        onItemSelect(data);
        setSearchQuery("");
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Error fetching item by barcode:", error);
    }
  };

  return (
    <div className="space-y-4">
      <Input
        placeholder="Scan Barcode / Cari Kode / Nama Barang"
        value={searchQuery}
        onChange={(e) => handleSearch(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && searchQuery.length >= 8) {
            handleBarcodeScanned(searchQuery);
          }
        }}
      />
      <ScrollArea className="h-[300px]">
        {isLoading ? (
          <div className="text-center py-4">Mencari barang...</div>
        ) : searchResults.length > 0 ? (
          <div className="space-y-2">
            {searchResults.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 hover:bg-accent rounded-lg"
              >
                <div>
                  <div className="font-medium">{item.nama}</div>
                  <div className="text-sm text-muted-foreground">
                    Stok: {item.stok} | Harga: Rp{" "}
                    {item.hargaJual.toLocaleString()}
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    onItemSelect(item);
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                  disabled={item.stok <= 0}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : searchQuery.length >= 2 ? (
          <div className="text-center py-4 text-muted-foreground">
            Tidak ada barang yang ditemukan
          </div>
        ) : null}
      </ScrollArea>
    </div>
  );
}
