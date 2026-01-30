"use client";

import Link from "next/link";
import { Search, Bell } from "lucide-react";
import { Notifications } from "./notifications";
import { UserMenu } from "./user-menu";
import { Input } from "@/components/ui/input";

interface HeaderProps {
  user: {
    id: string;
    name: string;
    email: string;
    nivel: string;
  };
}

export function Header({ user }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full h-16 border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-full items-center px-6 gap-4">
        {/* Search Bar */}
        <div className="flex-1 max-w-md">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              type="search"
              placeholder="Buscar peças, clientes, vendas..."
              className="pl-10 h-10 bg-muted/50 border-transparent hover:border-border focus:border-primary focus:bg-background transition-all"
            />
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Quick Stats */}
          <div className="hidden lg:flex items-center gap-4 mr-4 pr-4 border-r border-border">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Estoque</p>
              <p className="text-sm font-semibold text-foreground">--</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Vendas Hoje</p>
              <p className="text-sm font-semibold text-emerald-600">--</p>
            </div>
          </div>

          {/* Notifications */}
          <Notifications />

          {/* User Menu */}
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
