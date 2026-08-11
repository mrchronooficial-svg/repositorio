"use client";

import { useParams, useRouter } from "next/navigation";
import type { Route } from "next";
import { useQuery } from "@tanstack/react-query";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ClienteForm } from "@/components/forms/cliente-form";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/utils/trpc";

export default function EditarClientePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: cliente, isLoading } = useQuery({
    ...trpc.cliente.getById.queryOptions({ id }),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Cliente nao encontrado</h2>
        <button
          onClick={() => router.push("/clientes")}
          className="text-primary underline mt-4"
        >
          Voltar para listagem
        </button>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Clientes", href: "/clientes" },
          { label: cliente.nome, href: `/clientes/${id}` as Route },
          { label: "Editar" },
        ]}
      />

      <div className="mb-8">
        <h1 className="text-2xl font-bold">Editar Cliente</h1>
        <p className="text-muted-foreground">Atualize os dados do cliente</p>
      </div>

      <ClienteForm
        initialData={{
          id: cliente.id,
          tipo: cliente.tipo as "PESSOA_FISICA" | "PESSOA_JURIDICA",
          nome: cliente.nome,
          cpfCnpj: cliente.cpfCnpj,
          dataNascimento: cliente.dataNascimento
            ? new Date(cliente.dataNascimento).toISOString().slice(0, 10)
            : "",
          telefone: cliente.telefone,
          email: cliente.email || "",
          cep: cliente.cep,
          rua: cliente.rua,
          numero: cliente.numero,
          complemento: cliente.complemento || "",
          bairro: cliente.bairro,
          cidade: cliente.cidade,
          estado: cliente.estado,
        }}
        isEditing
      />
    </div>
  );
}
