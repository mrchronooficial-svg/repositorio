"use client";

import { authClient } from "@/lib/auth-client";

export function useSession() {
  return authClient.useSession();
}

export function useUser() {
  const { data: session, ...rest } = useSession();
  return {
    user: session?.user ?? null,
    ...rest,
  };
}
