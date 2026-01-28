"use client";

import { usePermissions, type Permissions } from "@/hooks/use-permissions";
import { ReactNode } from "react";

interface PermissionGateProps {
  children: ReactNode;
  /** Permissão necessária para exibir o conteúdo */
  permission: keyof Omit<Permissions, "nivel" | "isLoading">;
  /** Conteúdo alternativo se não tiver permissão */
  fallback?: ReactNode;
}

export function PermissionGate({
  children,
  permission,
  fallback = null,
}: PermissionGateProps) {
  const permissions = usePermissions();

  if (permissions.isLoading) {
    return null;
  }

  if (!permissions[permission]) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
