"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { DropForm } from "@/components/drop/DropForm";
import { trpc } from "@/utils/trpc";

interface DropItemData {
  id: string;
  pecaId: string;
  dropPrice: unknown;
  originalPrice: unknown;
  peca: {
    id: string;
    sku: string;
    marca: string;
    modelo: string;
    fotos: { id: string; url: string }[];
  };
}

interface DropData {
  id: string;
  date: string;
  launchTime: string;
  status: string;
  viewersBase: number;
  messagesBase: number;
  items: DropItemData[];
}

export default function EditarDropPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading } = useQuery(trpc.drop.list.queryOptions());

  const result = data as { active: DropData[]; scheduled: DropData[]; history: DropData[] } | undefined;
  const allDrops = [
    ...(result?.active ?? []),
    ...(result?.scheduled ?? []),
    ...(result?.history ?? []),
  ];
  const drop = allDrops.find((d) => d.id === id);

  if (isLoading) {
    return (
      <div>
        <Breadcrumbs
          items={[
            { label: "Drop do Dia", href: "/drop-do-dia" },
            { label: "Editar" },
          ]}
        />
        <div className="text-center text-muted-foreground py-8">
          Carregando...
        </div>
      </div>
    );
  }

  if (!drop) {
    return (
      <div>
        <Breadcrumbs
          items={[
            { label: "Drop do Dia", href: "/drop-do-dia" },
            { label: "Editar" },
          ]}
        />
        <div className="text-center text-muted-foreground py-8">
          Drop não encontrado
        </div>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Drop do Dia", href: "/drop-do-dia" },
          { label: "Editar Drop" },
        ]}
      />
      <h1 className="text-2xl font-semibold mb-6">Editar Drop</h1>
      <DropForm
        editMode
        dropId={drop.id}
        initialData={{
          date: drop.date.split("T")[0] ?? "",
          launchTime: drop.launchTime,
          viewersBase: drop.viewersBase,
          messagesBase: drop.messagesBase,
          items: drop.items.map((item) => ({
            pecaId: item.pecaId,
            dropPrice: Number(item.dropPrice),
            peca: item.peca
              ? {
                  id: item.peca.id,
                  sku: item.peca.sku,
                  marca: item.peca.marca,
                  modelo: item.peca.modelo,
                  fotos: item.peca.fotos as unknown as { id: string; url: string; ordem: number }[],
                  valorEstimadoVenda: item.dropPrice,
                }
              : undefined,
          })),
        }}
      />
    </div>
  );
}
