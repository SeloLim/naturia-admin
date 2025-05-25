"use client";

import NextLink from "next/link";
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "./ui/sidebar";
import { LayoutDashboard, Package, Image, ListTree, Droplets, User, Banknote, CreditCard, ShoppingCart } from "lucide-react";
import { usePathname } from 'next/navigation'

const groupedItems = [
  {
    label: "General",
    items: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "Products Management",
    items: [
      {
        title: "Product Categories",
        url: "/dashboard/product-categories",
        icon: ListTree,
      },
      {
        title: "Skin Types",
        url: "/dashboard/skin-types",
        icon: Droplets,
      },
      {
        title: "Products",
        url: "/dashboard/products",
        icon: Package,
      },
      {
        title: "Banners",
        url: "/dashboard/banners",
        icon: Image,
      },
    ],
  },
  {
    label: "Order Management",
    items: [
      {
        title: "Orders",
        url: "/dashboard/orders",
        icon: ShoppingCart,
      },
      {
        title: "Payments",
        url: "/dashboard/payments",
        icon: CreditCard,
      },
      {
        title: "Payment Methods",
        url: "/dashboard/payment-methods",
        icon: Banknote,
      },
    ],
  },
  {
    label: "User Management",
    items: [
      {
        title: "Users",
        url: "/dashboard/users",
        icon: User,
      },
    ],
  },
];


const SideBarMenuGroup = () => {
  const pathname = usePathname();

  return (
    <>
      {groupedItems.map((group) => (
        <SidebarGroup key={group.label}>
          <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
          <SidebarGroupContent className="px-2">
            <SidebarMenu className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.url;

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NextLink
                        href={item.url}
                        className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:!bg-button-secondary hover:text-white active:text-white transition 
                          ${isActive ? "bg-button-primary" : ""}`}
                      >
                        <item.icon className={`w-5 h-5 ${isActive ? "text-white" : ""}`} />
                        <span className={`${isActive ? "text-white" : ""}`}>
                          {item.title}
                        </span>
                      </NextLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
};

export default SideBarMenuGroup;
