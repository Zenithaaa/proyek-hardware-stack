"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

// Tipe recursive untuk nav
export interface NavItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  isActive?: boolean;
  items?: NavItem[];
}

/**
 * Render recursively, caret/collapsible icon di-animasi pada SEMUA dropdown.
 */
function RenderNavItems({ items }: { items: NavItem[] }) {
  return (
    <>
      {items.map((item) =>
        item.items && item.items.length > 0 ? (
          <Collapsible
            key={item.title}
            asChild
            defaultOpen={item.isActive}
            className="group/collapsible"
          >
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton tooltip={item.title}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                  {/* Animated caret for dropdown */}
                  <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                {item.icon ? (
                  <SidebarMenuSub>
                    <RenderNavSubItems items={item.items} />
                  </SidebarMenuSub>
                ) : (
                  <ul>
                    <RenderNavSubItems items={item.items} />
                  </ul>
                )}
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        ) : (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton asChild tooltip={item.title}>
              <a href={item.url}>
                {item.icon && <item.icon />}
                <span>{item.title}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      )}
    </>
  );
}

/**
 * Untuk sub/dropdown children (nested), caret juga DIANIMASI.
 */
function RenderNavSubItems({ items }: { items: NavItem[] }) {
  return (
    <>
      {items.map((subItem) =>
        subItem.items && subItem.items.length > 0 ? (
          <Collapsible
            key={subItem.title}
            asChild
            defaultOpen={subItem.isActive}
            className="group/collapsible"
          >
            <SidebarMenuSubItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuSubButton>
                  <span>{subItem.title}</span>
                  {/* Animated caret for dropdown (Daftar Barang) */}
                  <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </SidebarMenuSubButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ul>
                  <RenderNavSubItems items={subItem.items!} />
                </ul>
              </CollapsibleContent>
            </SidebarMenuSubItem>
          </Collapsible>
        ) : (
          <SidebarMenuSubItem key={subItem.title}>
            <SidebarMenuSubButton asChild>
              <a href={subItem.url}>
                <span>{subItem.title}</span>
              </a>
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        )
      )}
    </>
  );
}

export function NavMain({ items }: { items: NavItem[] }) {
  return (
    <SidebarGroup>
      <SidebarMenu>
        <RenderNavItems items={items} />
      </SidebarMenu>
    </SidebarGroup>
  );
}
