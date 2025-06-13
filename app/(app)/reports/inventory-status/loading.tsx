// app/(app)/reports/inventory-status/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingInventoryStatus() {
  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Laporan Stok Barang</h1>
        <Skeleton className="h-10 w-40" />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>

      <div className="border rounded-md">
        <div className="p-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center space-x-4 py-4 border-b last:border-0"
            >
              <Skeleton className="h-6 w-6" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
