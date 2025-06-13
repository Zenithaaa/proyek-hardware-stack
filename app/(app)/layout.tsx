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
        return "Penjualan";
      case "/purchases":
        return "Daftar Transaksi Pembelian";
      case "/inventory/items/new":
        return "Inventaris";
      case "/inventory/category":
        return "Inventaris";
      case "/inventory/stock-adjustments":
        return "Inventaris";
      case "/purchases/receipts/new":
        return "Pembelian";
      case "/purchases/suppliers":
        return "Pembelian";
      case "/purchases/orders":
        return "Pembelian";
      case "/purchases/orders/new":
        return "Pembelian";
      case "/purchases/orders/:id":
        return "Pembelian";
      case "/customers":
        return "Pelanggan";
      case "/purchases/receipts":
        return "Pembelian";
      case "/reports/inventory-status":
        return "Laporan";
      case "/reports/sales-summary":
        return "Laporan";
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
