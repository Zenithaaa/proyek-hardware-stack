"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();

  const getPageTitle = (path: string) => {
    switch (path) {
      case "/dashboard":
        return "Dashboard";
      case "/sales/transactions":
        return "Daftar Transaksi Penjualan";
      case "/purchases":
        return "Daftar Transaksi Pembelian";
      case "/inventory/items/new":
        return "Daftar Barang Inventaris";
      case "/inventory/category":
        return "Manajemen Kategori Barang";
      case "/inventory/stock-adjustments":
        return "Penyesuaian Stok";
      case "/customers":
        return "Daftar Pelanggan";
      case "/reports/inventory-status":
        return "Laporan Stok Barang";
      case "/reports/sales-summary":
        return "Laporan Penjualan";
      case "/reports/purchases":
        return "Laporan Pembelian";
      case "/pos":
        return "Point of Sale";
      case "/settings":
        return "Pengaturan";
      default:
        return "Dashboard";
    }
  };

  const pageTitle = getPageTitle(pathname);

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader pageTitle={pageTitle} />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
};

export default DashboardLayout;
