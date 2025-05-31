"use client";

import * as React from "react";
import {
  ArrowRightLeft,
  BookOpen,
  FileText,
  Frame,
  GalleryVerticalEnd,
  LayoutDashboard,
  Map,
  Package,
  PieChart,
  Settings2,
  User,
  Users,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { IconReport } from "@tabler/icons-react";
import Image from "next/image";

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Point of Sale",
      url: "#",
      icon: ArrowRightLeft,
      items: [
        {
          title: "Mulai Transaksi Baru",
          url: "/pos",
        },
      ],
    },
    {
      title: "Penjualan",
      url: "#",
      icon: FileText,
      items: [
        {
          title: "Daftar Transaksi",
          url: "/sales/transactions",
        },
      ],
    },
    {
      title: "Inventaris",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "Daftar Barang",
          url: "/inventory/items/new",
        },
        {
          title: "Kategori Barang",
          url: "/inventory/category",
        },
        {
          title: "Penyesuaian Stok",
          url: "/inventory/stock-adjustments",
        },
      ],
    },
    {
      title: "Pembelian",
      url: "#",
      icon: Package,
      items: [
        {
          title: "Daftar Supplier",
          url: "/purchases/suppliers",
        },
        {
          title: "Pesanan Pembelian (PO)",
          url: "/purchases/orders",
        },
        {
          title: "Penerimaan Barang",
          url: "/purchases/receipts",
        },
      ],
    },
    {
      title: "Pelanggan",
      url: "#",
      icon: User,
      items: [
        {
          title: "Daftar Pelanggan",
          url: "/customers",
        },
      ],
    },
    {
      title: "Laporan",
      url: "#",
      icon: IconReport,
      items: [
        {
          title: "Laporan Penjualan",
          url: "/reports/sales-summary",
        },
        {
          title: "Laporan Stok",
          url: "/reports/inventory-status",
        },
        /*
        {
          title: "Laporan Laba Rugi",
          url: "/reports/profit-loss",
        },
        */
      ],
    },
    /*
    {
      title: "Pengaturan",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "Info Toko",
          url: "/settings/store-info",
        },
        {
          title: "Preferensi Aplikasi",
          url: "/settings/application-preferences",
        },
      ],
  },
*/
  ],
  projects: [
    {
      name: "Design Engineering",
      url: "#",
      icon: Frame,
    },
    {
      name: "Sales & Marketing",
      url: "#",
      icon: PieChart,
    },
    {
      name: "Travel",
      url: "#",
      icon: Map,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="flex aspect-square size-8 items-center justify-center">
                  <Image
                    src="/logo.svg"
                    alt="Picture of the author"
                    width={500}
                    height={500}
                  />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Hardware Stack</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
