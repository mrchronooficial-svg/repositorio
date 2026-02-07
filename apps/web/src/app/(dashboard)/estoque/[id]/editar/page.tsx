"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { PecaForm } from "@/components/forms/peca-form";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/utils/trpc";

export default function EditarPecaPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: peca, isLoading } = useQuery({
    ...trpc.peca.getById.queryOptions({ id }),
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

  if (!peca) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Peca nao encontrada</h2>
        <button
          onClick={() => router.push("/estoque")}
          className="text-primary underline mt-4"
        >
          Voltar para estoque
        </button>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Estoque", href: "/estoque" },
          { label: peca.sku, href: `/estoque/${id}` },
          { label: "Editar" },
        ]}
      />

      <div className="mb-8">
        <h1 className="text-2xl font-bold">Editar Peca</h1>
        <p className="text-muted-foreground">
          Atualize os dados da peca {peca.sku}
        </p>
      </div>

      <PecaForm
        initialData={{
          id: peca.id,
          marca: peca.marca,
          modelo: peca.modelo,
          ano: peca.ano?.toString() || "",
          tamanhoCaixa: peca.tamanhoCaixa.toString(),
          materialCaixa: peca.materialCaixa || "",
          materialPulseira: peca.materialPulseira || "",
          valorCompra: peca.valorCompra ? Number(peca.valorCompra).toString() : "",
          valorEstimadoVenda: peca.valorEstimadoVenda ? Number(peca.valorEstimadoVenda).toString() : "",
          origemTipo: peca.origemTipo as "COMPRA" | "CONSIGNACAO",
          origemCanal: (peca.origemCanal as "PESSOA_FISICA" | "LEILAO_BRASIL" | "EBAY") || "",
          tipoRepasse: peca.percentualRepasse ? "PERCENTUAL" as const : "FIXO" as const,
          valorRepasse: peca.valorRepasse ? Number(peca.valorRepasse).toString() : "",
          percentualRepasse: peca.percentualRepasse ? peca.percentualRepasse.toString() : "",
          localizacao: peca.localizacao,
          fornecedorId: peca.fornecedorId,
          fotos: peca.fotos.map((f) => f.url),
        }}
        isEditing
      />
    </div>
  );
}
