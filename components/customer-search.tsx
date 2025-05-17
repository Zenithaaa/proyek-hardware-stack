"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User } from "lucide-react";

type Customer = {
  id: number;
  nama: string;
  noTelp?: string | null;
  poinLoyalitas?: number | null;
  alamat?: string | null;
};

type CustomerSearchProps = {
  onCustomerSelect: (customer: Customer) => void;
};

export default function CustomerSearch({
  onCustomerSelect,
}: CustomerSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
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
        `/api/customers/search?q=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error("Error searching customers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Input
        placeholder="Cari nama atau nomor telepon pelanggan"
        value={searchQuery}
        onChange={(e) => handleSearch(e.target.value)}
      />
      <ScrollArea className="h-[300px]">
        {isLoading ? (
          <div className="text-center py-4">Mencari pelanggan...</div>
        ) : searchResults.length > 0 ? (
          <div className="space-y-2">
            {searchResults.map((customer) => (
              <div
                key={customer.id}
                className="flex items-center justify-between p-2 hover:bg-accent rounded-lg cursor-pointer"
                onClick={() => {
                  onCustomerSelect(customer);
                  setSearchQuery("");
                  setSearchResults([]);
                }}
              >
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{customer.nama}</div>
                    <div className="text-sm text-muted-foreground">
                      {customer.noTelp || "No. Telp tidak tersedia"}
                    </div>
                  </div>
                </div>
                {customer.poinLoyalitas ? (
                  <Badge variant="outline" className="ml-2">
                    {customer.poinLoyalitas} Poin
                  </Badge>
                ) : null}
              </div>
            ))}
          </div>
        ) : searchQuery.length >= 2 ? (
          <div className="text-center py-4 text-muted-foreground">
            Tidak ada pelanggan yang ditemukan
          </div>
        ) : null}
      </ScrollArea>
    </div>
  );
}
