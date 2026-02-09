"use client";

import { Suspense } from "react";
import { useForm } from "@tanstack/react-form";
import { useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { toast } from "sonner";
import z from "zod";
import { useEffect } from "react";
import { Watch, Crown, ArrowRight } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import Loader from "@/components/loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (session?.user) {
      router.push(callbackUrl as Route);
    }
  }, [session, router, callbackUrl]);

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.signIn.email(
        {
          email: value.email,
          password: value.password,
        },
        {
          onSuccess: () => {
            toast.success("Login realizado com sucesso!");
            router.push(callbackUrl as Route);
          },
          onError: (error) => {
            const message = error.error.message || "Erro ao fazer login";
            if (message.includes("Invalid")) {
              toast.error("Email ou senha incorretos");
            } else {
              toast.error(message);
            }
          },
        },
      );
    },
    validators: {
      onSubmit: z.object({
        email: z.string().email("Email inválido"),
        password: z.string().min(1, "Senha é obrigatória"),
      }),
    },
  });

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-sidebar relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-20 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col justify-center px-16 w-full">
          {/* Logo */}
          <div className="flex items-center gap-4 mb-12">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center shadow-2xl shadow-amber-500/30">
                <Watch className="h-8 w-8 text-white drop-shadow" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center">
                <Crown className="h-3 w-3 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Mr. Chrono</h1>
              <p className="text-amber-400/80 text-sm font-medium">Sistema de Gestão</p>
            </div>
          </div>

          {/* Tagline */}
          <div className="space-y-6">
            <h2 className="text-4xl font-bold text-white leading-tight">
              Gestão inteligente para{" "}
              <span className="text-gradient-secondary">relógios vintage</span>
            </h2>
            <p className="text-white/60 text-lg max-w-md">
              Controle seu estoque, vendas, clientes e fornecedores em um único lugar.
              Feito especialmente para relojoarias.
            </p>
          </div>

          {/* Features */}
          <div className="mt-12 grid grid-cols-2 gap-6">
            {[
              { label: "Estoque", desc: "Controle completo" },
              { label: "Vendas", desc: "Rastreamento total" },
              { label: "Clientes", desc: "Histórico detalhado" },
              { label: "Relatórios", desc: "Insights precisos" },
            ].map((feature) => (
              <div
                key={feature.label}
                className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3 border border-white/10"
              >
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <div>
                  <p className="text-white font-medium text-sm">{feature.label}</p>
                  <p className="text-white/40 text-xs">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
                <Watch className="h-6 w-6 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center">
                <Crown className="h-2 w-2 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Mr. Chrono</h1>
              <p className="text-xs text-muted-foreground">Sistema de Gestão</p>
            </div>
          </div>

          {/* Form Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">Bem-vindo de volta</h2>
            <p className="text-muted-foreground">Entre com suas credenciais para acessar o sistema</p>
          </div>

          {/* Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
            className="space-y-5"
          >
            <form.Field name="email">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name} className="text-sm font-medium">
                    Email
                  </Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="email"
                    placeholder="seu@email.com"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="h-12"
                  />
                  {field.state.meta.errors.map((error) => (
                    <p key={error?.message} className="text-sm text-destructive">
                      {error?.message}
                    </p>
                  ))}
                </div>
              )}
            </form.Field>

            <form.Field name="password">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name} className="text-sm font-medium">
                    Senha
                  </Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="password"
                    placeholder="••••••••"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="h-12"
                  />
                  {field.state.meta.errors.map((error) => (
                    <p key={error?.message} className="text-sm text-destructive">
                      {error?.message}
                    </p>
                  ))}
                </div>
              )}
            </form.Field>

            <form.Subscribe>
              {(state) => (
                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-12 text-base"
                  disabled={!state.canSubmit || state.isSubmitting}
                >
                  {state.isSubmitting ? (
                    "Entrando..."
                  ) : (
                    <>
                      Entrar
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
            </form.Subscribe>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Acesso restrito a usuários autorizados.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
