"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { VendaForm } from "@/components/forms/venda-form";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { trpc } from "@/utils/trpc";

function formatDateForInput(date: Date | string): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function EditarVendaPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: venda, isLoading } = useQuery({
    ...trpc.venda.getById.queryOptions({ id }),
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

  if (!venda) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Venda nao encontrada</h2>
        <Button
          variant="link"
          onClick={() => router.push("/vendas")}
          className="mt-4"
        >
          Voltar para vendas
        </Button>
      </div>
    );
  }

  if (venda.cancelada) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Venda cancelada nao pode ser editada</h2>
        <Button
          variant="link"
          onClick={() => router.push(`/vendas/${id}`)}
          className="mt-4"
        >
          Voltar para detalhes
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Vendas", href: "/vendas" },
          { label: `Venda #${venda.id.slice(-6)}`, href: `/vendas/${id}` },
          { label: "Editar" },
        ]}
      />

      <div className="mb-8">
        <h1 className="text-2xl font-bold">Editar Venda</h1>
        <p className="text-muted-foreground">
          Atualize os dados da venda #{venda.id.slice(-6)}
        </p>
      </div>

      <VendaForm
        initialData={{
          id: venda.id,
          pecaId: venda.peca.id,
          clienteId: venda.cliente.id,
          valorOriginal: venda.valorOriginal ? Number(venda.valorOriginal) : 0,
          valorFinal: venda.valorFinal ? Number(venda.valorFinal).toString() : "",
          formaPagamento: venda.formaPagamento as "PIX" | "CREDITO_VISTA" | "CREDITO_PARCELADO",
          parcelas: venda.parcelas ? venda.parcelas.toString() : "",
          observacaoLogistica: venda.observacaoLogistica || "",
          dataVenda: formatDateForInput(venda.dataVenda),
          valorDeclarar: venda.valorDeclarar ? Number(venda.valorDeclarar).toString() : "",
        }}
        isEditing
      />
    </div>
  );
}
