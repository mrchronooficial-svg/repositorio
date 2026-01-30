"use client";

import { LogOut, User, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface UserMenuProps {
  user: {
    name: string;
    email: string;
    nivel?: string;
  };
}

const nivelLabels: Record<string, string> = {
  ADMINISTRADOR: "Administrador",
  SOCIO: "Sócio",
  FUNCIONARIO: "Funcionário",
};

const nivelColors: Record<string, string> = {
  ADMINISTRADOR: "from-amber-400 to-amber-600",
  SOCIO: "from-sky-400 to-sky-600",
  FUNCIONARIO: "from-slate-400 to-slate-500",
};

export function UserMenu({ user }: UserMenuProps) {
  const router = useRouter();

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  const nivel = user.nivel || "FUNCIONARIO";

  async function handleSignOut() {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          toast.success("Logout realizado com sucesso");
          router.push("/login");
        },
      },
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-3 h-auto py-2 px-3 rounded-xl hover:bg-accent transition-colors outline-none cursor-pointer">
        <Avatar className="h-9 w-9 border-2 border-primary/20">
          <AvatarFallback
            className={cn(
              "bg-gradient-to-br text-white font-semibold text-xs",
              nivelColors[nivel]
            )}
          >
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="hidden md:flex flex-col items-start">
          <span className="text-sm font-medium text-foreground">
            {user.name?.split(" ")[0] || "Usuário"}
          </span>
          <span className="text-xs text-muted-foreground">
            {nivelLabels[nivel]}
          </span>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-2">
        <DropdownMenuLabel className="p-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-primary/20">
              <AvatarFallback
                className={cn(
                  "bg-gradient-to-br text-white font-semibold",
                  nivelColors[nivel]
                )}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <p className="text-sm font-semibold">{user.name || "Usuário"}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="p-3 rounded-lg cursor-pointer">
          <User className="mr-3 h-4 w-4" />
          Meu Perfil
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="p-3 rounded-lg cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
        >
          <LogOut className="mr-3 h-4 w-4" />
          Sair do Sistema
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
