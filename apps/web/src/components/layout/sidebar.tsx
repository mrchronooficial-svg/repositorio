"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Truck,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  userLevel: string;
}

const menuItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Estoque",
    href: "/estoque",
    icon: Package,
  },
  {
    label: "Vendas",
    href: "/vendas",
    icon: ShoppingCart,
  },
  {
    label: "Clientes",
    href: "/clientes",
    icon: Users,
  },
  {
    label: "Fornecedores",
    href: "/fornecedores",
    icon: Truck,
  },
];

const adminItems = [
  {
    label: "Admin",
    href: "/admin",
    icon: Settings,
  },
];

export function Sidebar({ userLevel }: SidebarProps) {
  const pathname = usePathname();
  const isAdmin = userLevel === "ADMINISTRADOR";

  const items = isAdmin ? [...menuItems, ...adminItems] : menuItems;

  return (
    <aside className="w-64 min-h-[calc(100vh-3.5rem)] border-r bg-background">
      <nav className="flex flex-col gap-1 p-4">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
