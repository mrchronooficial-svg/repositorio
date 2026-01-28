"use client";

import Link from "next/link";
import { Notifications } from "./notifications";
import { UserMenu } from "./user-menu";

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
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 gap-4">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <span className="text-lg">Mr. Chrono</span>
        </Link>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Notificações */}
        <Notifications />

        {/* Menu do Usuário */}
        <UserMenu user={user} />
      </div>
    </header>
  );
}
