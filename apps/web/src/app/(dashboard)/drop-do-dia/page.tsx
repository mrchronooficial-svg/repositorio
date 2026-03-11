"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Zap, Plus, Calendar, Clock, ShoppingBag, Eye, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { MarkAsSoldModal } from "@/components/drop/MarkAsSoldModal";
import { trpc } from "@/utils/trpc";
import { toast } from "sonner";

interface DropItemData {
  id: string;
  pecaId: string;
  dropPrice: unknown;
  originalPrice: unknown;
  status: string;
  soldAt: string | null;
  vendaId: string | null;
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
  launchDateTime: string;
  status: string;
  viewersBase: number;
  messagesBase: number;
  items: DropItemData[];
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatPrice(value: unknown) {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getStatusBadge(status: string) {
  switch (status) {
    case "ACTIVE":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Ativo</Badge>;
    case "SCHEDULED":
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Agendado</Badge>;
    case "COMPLETED":
      return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Encerrado</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function DropCard({
  drop,
  showActions,
  onMarkSold,
}: {
  drop: DropData;
  showActions: "active" | "scheduled" | "history";
  onMarkSold?: (item: DropItemData) => void;
}) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation(
    trpc.drop.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.drop.list.queryKey() });
        toast.success("Drop excluído com sucesso");
      },
      onError: (error: { message: string }) => {
        toast.error(error.message);
      },
    })
  );

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base font-medium">
              {formatDate(drop.date)}
            </CardTitle>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {drop.launchTime}
            </div>
            {getStatusBadge(drop.status)}
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {drop.viewersBase}
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle className="h-3.5 w-3.5" />
              {drop.messagesBase}
            </div>

            {showActions === "scheduled" && (
              <div className="flex items-center gap-2 ml-2">
                <Link href={`/drop-do-dia/${drop.id}/editar` as Route}>
                  <Button variant="outline" size="sm">
                    Editar
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => deleteMutation.mutate({ id: drop.id })}
                  disabled={deleteMutation.isPending}
                >
                  Excluir
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid gap-3">
          {drop.items.map((item) => {
            const fotoUrl = item.peca?.fotos?.[0]?.url;
            return (
              <div
                key={item.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  item.status === "SOLD"
                    ? "bg-gray-50 opacity-70"
                    : "bg-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  {fotoUrl && (
                    <img
                      src={fotoUrl}
                      alt={`${item.peca.marca} ${item.peca.modelo}`}
                      className="h-12 w-12 rounded object-cover"
                    />
                  )}
                  <div>
                    <p className="font-medium text-sm">
                      {item.peca?.marca} {item.peca?.modelo}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.peca?.sku}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    {Number(item.dropPrice) < Number(item.originalPrice) && (
                      <p className="text-xs text-muted-foreground line-through">
                        {formatPrice(item.originalPrice)}
                      </p>
                    )}
                    <p className="font-semibold text-sm">
                      {formatPrice(item.dropPrice)}
                    </p>
                  </div>

                  {item.status === "SOLD" ? (
                    <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                      Vendido
                    </Badge>
                  ) : showActions === "active" && onMarkSold ? (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => onMarkSold(item)}
                    >
                      <ShoppingBag className="h-3.5 w-3.5 mr-1" />
                      Marcar como Vendido
                    </Button>
                  ) : (
                    <Badge variant="outline" className="text-green-700">
                      Disponível
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DropDoDiaPage() {
  const [selectedItem, setSelectedItem] = useState<DropItemData | null>(null);
  const [showSoldModal, setShowSoldModal] = useState(false);

  const { data, isLoading } = useQuery(trpc.drop.list.queryOptions());

  const result = data as { active: DropData[]; scheduled: DropData[]; history: DropData[] } | undefined;
  const activeDrops = result?.active ?? [];
  const scheduledDrops = result?.scheduled ?? [];
  const completedDrops = result?.history ?? [];
  const totalDrops = activeDrops.length + scheduledDrops.length + completedDrops.length;

  function handleMarkSold(item: DropItemData) {
    setSelectedItem(item);
    setShowSoldModal(true);
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: "Drop do Dia" }]} />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Zap className="h-6 w-6 text-yellow-500" />
          <h1 className="text-2xl font-semibold">Drop do Dia</h1>
        </div>
        <Link href={"/drop-do-dia/novo" as Route}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo Drop
          </Button>
        </Link>
      </div>

      {isLoading && (
        <div className="text-center text-muted-foreground py-8">
          Carregando drops...
        </div>
      )}

      {!isLoading && totalDrops === 0 && (
        <div className="text-center py-16">
          <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">
            Nenhum drop cadastrado ainda
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Crie seu primeiro drop para começar
          </p>
          <Link href={"/drop-do-dia/novo" as Route}>
            <Button className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Criar Drop
            </Button>
          </Link>
        </div>
      )}

      {activeDrops.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-medium mb-3 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Drop Ativo
          </h2>
          {activeDrops.map((drop) => (
            <DropCard
              key={drop.id}
              drop={drop}
              showActions="active"
              onMarkSold={handleMarkSold}
            />
          ))}
        </section>
      )}

      {scheduledDrops.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-medium mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-500" />
            Drops Agendados
          </h2>
          {scheduledDrops.map((drop) => (
            <DropCard key={drop.id} drop={drop} showActions="scheduled" />
          ))}
        </section>
      )}

      {completedDrops.length > 0 && (
        <section>
          <h2 className="text-lg font-medium mb-3 text-muted-foreground">
            Histórico
          </h2>
          {completedDrops.map((drop) => (
            <DropCard key={drop.id} drop={drop} showActions="history" />
          ))}
        </section>
      )}

      {selectedItem && (
        <MarkAsSoldModal
          open={showSoldModal}
          onOpenChange={setShowSoldModal}
          item={selectedItem}
        />
      )}
    </div>
  );
}
