"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { FornecedorForm } from "@/components/forms/fornecedor-form";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/utils/trpc";

export default function EditarFornecedorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: fornecedor, isLoading } = useQuery({
    ...trpc.fornecedor.getById.queryOptions({ id }),
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

  if (!fornecedor) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Fornecedor nao encontrado</h2>
        <button
          onClick={() => router.push("/fornecedores")}
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
          { label: "Fornecedores", href: "/fornecedores" },
          { label: fornecedor.nome, href: `/fornecedores/${id}` },
          { label: "Editar" },
        ]}
      />

      <div className="mb-8">
        <h1 className="text-2xl font-bold">Editar Fornecedor</h1>
        <p className="text-muted-foreground">
          Atualize os dados do fornecedor
        </p>
      </div>

      <FornecedorForm
        initialData={{
          id: fornecedor.id,
          tipo: fornecedor.tipo as "PESSOA_FISICA" | "PESSOA_JURIDICA",
          nome: fornecedor.nome,
          cpfCnpj: fornecedor.cpfCnpj,
          telefone: fornecedor.telefone,
          email: fornecedor.email || "",
          cep: fornecedor.cep,
          rua: fornecedor.rua,
          numero: fornecedor.numero,
          complemento: fornecedor.complemento || "",
          bairro: fornecedor.bairro,
          cidade: fornecedor.cidade,
          estado: fornecedor.estado,
          score: fornecedor.score as "EXCELENTE" | "BOM" | "REGULAR" | "RUIM" | undefined,
        }}
        isEditing
      />
    </div>
  );
}
