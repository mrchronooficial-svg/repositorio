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
  Watch,
  Crown,
  PackageCheck,
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
    color: "from-amber-400 to-amber-600",
  },
  {
    label: "Estoque",
    href: "/estoque",
    icon: Package,
    color: "from-emerald-400 to-emerald-600",
  },
  {
    label: "Vendas",
    href: "/vendas",
    icon: ShoppingCart,
    color: "from-sky-400 to-sky-600",
  },
  {
    label: "Logistica",
    href: "/logistica",
    icon: PackageCheck,
    color: "from-teal-400 to-teal-600",
  },
  {
    label: "Clientes",
    href: "/clientes",
    icon: Users,
    color: "from-violet-400 to-violet-600",
  },
  {
    label: "Fornecedores",
    href: "/fornecedores",
    icon: Truck,
    color: "from-rose-400 to-rose-600",
  },
];

const adminItems = [
  {
    label: "Administração",
    href: "/admin",
    icon: Settings,
    color: "from-slate-400 to-slate-500",
  },
];

export function Sidebar({ userLevel }: SidebarProps) {
  const pathname = usePathname();
  const isAdmin = userLevel === "ADMINISTRADOR";

  const items = isAdmin ? [...menuItems, ...adminItems] : menuItems;

  return (
    <aside className="w-72 min-h-[calc(100vh-4rem)] gradient-sidebar border-r border-white/[0.08] relative">
      {/* Logo Section */}
      <div className="p-6 border-b border-white/[0.08]">
        <Link href="/dashboard" className="flex items-center gap-4 group">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/25 group-hover:shadow-amber-500/40 transition-all duration-300 group-hover:scale-105">
              <Watch className="h-6 w-6 text-white drop-shadow" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center">
              <Crown className="h-2.5 w-2.5 text-white" />
            </div>
          </div>
          <div>
            <h1 className="font-bold text-white text-xl tracking-tight">Mr. Chrono</h1>
            <p className="text-[11px] text-amber-400/80 font-medium tracking-wide">Sistema de Gestão</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1.5 p-5">
        <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-semibold mb-3 px-3">
          Menu Principal
        </p>
        {menuItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-4 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-white/[0.12] text-white shadow-lg shadow-black/10"
                  : "text-white/50 hover:text-white hover:bg-white/[0.06]"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300",
                  isActive
                    ? `bg-gradient-to-br ${item.color} shadow-lg`
                    : "bg-white/[0.06] group-hover:bg-white/[0.10]"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-all duration-200",
                    isActive ? "text-white drop-shadow" : "text-white/60 group-hover:text-white/90",
                    "group-hover:scale-110"
                  )}
                />
              </div>
              <span className="flex-1">{item.label}</span>
              {isActive && (
                <div className="w-2 h-2 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-sm shadow-amber-500/50" />
              )}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="my-4 border-t border-white/[0.06]" />
            <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-semibold mb-3 px-3">
              Sistema
            </p>
            {adminItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-4 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-white/[0.12] text-white shadow-lg shadow-black/10"
                      : "text-white/50 hover:text-white hover:bg-white/[0.06]"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300",
                      isActive
                        ? `bg-gradient-to-br ${item.color} shadow-lg`
                        : "bg-white/[0.06] group-hover:bg-white/[0.10]"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5 transition-all duration-200",
                        isActive ? "text-white drop-shadow" : "text-white/60 group-hover:text-white/90",
                        "group-hover:scale-110"
                      )}
                    />
                  </div>
                  <span className="flex-1">{item.label}</span>
                  {isActive && (
                    <div className="w-2 h-2 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-sm shadow-amber-500/50" />
                  )}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* User Level Badge */}
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <div className="flex items-center gap-4 px-4 py-3.5 rounded-xl bg-gradient-to-r from-white/[0.08] to-white/[0.04] border border-white/[0.06]">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-lg",
            userLevel === "ADMINISTRADOR"
              ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-amber-500/25"
              : userLevel === "SOCIO"
              ? "bg-gradient-to-br from-sky-400 to-sky-600 text-white shadow-sky-500/25"
              : "bg-gradient-to-br from-slate-400 to-slate-600 text-white shadow-slate-500/25"
          )}>
            {userLevel === "ADMINISTRADOR" ? "A" : userLevel === "SOCIO" ? "S" : "F"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {userLevel === "ADMINISTRADOR"
                ? "Administrador"
                : userLevel === "SOCIO"
                ? "Sócio"
                : "Funcionário"}
            </p>
            <p className="text-[11px] text-white/40">Nível de acesso</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
