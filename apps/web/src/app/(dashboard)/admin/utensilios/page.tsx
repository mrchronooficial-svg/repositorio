"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Minus, Package, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/utils/trpc";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function UtensiliosPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: utensilios, isLoading } = useQuery(
    trpc.utensilio.list.queryOptions()
  );

  // Estado para controlar quantidades a adicionar
  const [quantidades, setQuantidades] = useState<Record<string, number>>({});

  // Mutation para inicializar utensílios
  const inicializarMutation = useMutation({
    ...trpc.utensilio.inicializar.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["utensilio"] });
      toast.success("Utensilios inicializados com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao inicializar utensilios: " + error.message);
    },
  });

  // Mutation para adicionar quantidade
  const adicionarMutation = useMutation({
    ...trpc.utensilio.adicionarQuantidade.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["utensilio"] });
      toast.success("Quantidade adicionada!");
    },
    onError: (error) => {
      toast.error("Erro: " + error.message);
    },
  });

  // Mutation para atualizar quantidade mínima
  const atualizarMinMutation = useMutation({
    ...trpc.utensilio.atualizarQuantidadeMinima.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["utensilio"] });
      toast.success("Quantidade minima atualizada!");
    },
    onError: (error) => {
      toast.error("Erro: " + error.message);
    },
  });

  const handleAdicionar = (id: string) => {
    const quantidade = quantidades[id] || 0;
    if (quantidade > 0) {
      adicionarMutation.mutate({ id, quantidade });
      setQuantidades((prev) => ({ ...prev, [id]: 0 }));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/admin")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Utensilios de Embalagem</h1>
          <p className="text-muted-foreground">
            Gerencie o estoque de materiais para envio
          </p>
        </div>
      </div>

      {/* Botão para inicializar se não existir nenhum */}
      {(!utensilios || utensilios.length === 0) && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              Nenhum utensilio cadastrado ainda.
            </p>
            <Button
              onClick={() => inicializarMutation.mutate()}
              disabled={inicializarMutation.isPending}
            >
              <Plus className="h-4 w-4 mr-2" />
              Inicializar Utensilios Padrao
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Grid de utensílios */}
      {utensilios && utensilios.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {utensilios.map((utensilio) => {
            const estoqueBaixo = utensilio.quantidade <= utensilio.quantidadeMinima;
            return (
              <Card
                key={utensilio.id}
                className={cn(
                  estoqueBaixo && "border-red-200 bg-red-50"
                )}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between">
                    <span>{utensilio.nome}</span>
                    {estoqueBaixo && (
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Quantidade atual */}
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Quantidade em estoque</p>
                    <p className={cn(
                      "text-4xl font-bold",
                      estoqueBaixo ? "text-red-600" : "text-green-600"
                    )}>
                      {utensilio.quantidade}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Minimo: {utensilio.quantidadeMinima}
                    </p>
                  </div>

                  {/* Adicionar quantidade */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setQuantidades((prev) => ({
                          ...prev,
                          [utensilio.id]: Math.max((prev[utensilio.id] || 0) - 1, 0),
                        }))
                      }
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      min="0"
                      value={quantidades[utensilio.id] || 0}
                      onChange={(e) =>
                        setQuantidades((prev) => ({
                          ...prev,
                          [utensilio.id]: Math.max(parseInt(e.target.value) || 0, 0),
                        }))
                      }
                      className="text-center"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setQuantidades((prev) => ({
                          ...prev,
                          [utensilio.id]: (prev[utensilio.id] || 0) + 1,
                        }))
                      }
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => handleAdicionar(utensilio.id)}
                    disabled={!quantidades[utensilio.id] || adicionarMutation.isPending}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar ao Estoque
                  </Button>

                  {/* Editar quantidade mínima */}
                  <div className="pt-2 border-t">
                    <label className="text-xs text-muted-foreground">
                      Quantidade minima (alerta)
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="number"
                        min="0"
                        defaultValue={utensilio.quantidadeMinima}
                        className="text-center"
                        onBlur={(e) => {
                          const novoMin = parseInt(e.target.value) || 0;
                          if (novoMin !== utensilio.quantidadeMinima) {
                            atualizarMinMutation.mutate({
                              id: utensilio.id,
                              quantidadeMinima: novoMin,
                            });
                          }
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="py-4">
          <p className="text-sm text-blue-800">
            <strong>Como funciona:</strong> Quando uma venda e marcada como "Enviada" na
            logistica, o sistema automaticamente subtrai 1 unidade de cada utensilio.
            Configure a quantidade minima para receber alertas de estoque baixo.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
