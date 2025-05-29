import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingDashboard() {
  return (
    <div>
      <div className="mt-5 p-4 md:p-6">
        {/* Skeleton for SectionCards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
      <div className="m-6">
        {/* Skeleton for ChartAreaInteractive */}
        <Skeleton className="h-64 w-full" />
      </div>
      <div className="mb-6 p-4 md:p-6">
        {/* Skeleton for DataTable */}
        <div className="flex items-center justify-end py-4">
          <Skeleton className="h-10 w-32" />{" "}
          {/* Placeholder for Customize Columns Button */}
        </div>
        <div className="rounded-md border">
          {/* Placeholder for Table Header */}
          <div className="p-4">
            <Skeleton className="h-8 w-full" />
          </div>
          {/* Placeholder for Table Body Rows */}
          <div className="p-4 space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        {/* Placeholder for Pagination */}
        <div className="flex items-center justify-between py-4 mt-2 px-4">
          <Skeleton className="h-8 w-48" />{" "}
          {/* Placeholder for selected rows text */}
          <div className="flex items-center gap-2">
            {" "}
            {/* Placeholder for pagination controls */}
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      </div>
    </div>
  );
}
