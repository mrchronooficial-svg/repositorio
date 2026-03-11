"use client";

import { useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, X, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/utils/trpc";
import { toast } from "sonner";

interface PecaResult {
  id: string;
  sku: string;
  marca: string;
  modelo: string;
  fotos: { id: string; url: string; ordem: number }[];
  valorEstimadoVenda: unknown;
}

interface SelectedItem {
  pecaId: string;
  dropPrice: number;
  peca?: PecaResult;
}

interface DropFormProps {
  editMode?: boolean;
  dropId?: string;
  initialData?: {
    date: string;
    launchTime: string;
    viewersBase: number;
    messagesBase: number;
    items: SelectedItem[];
  };
}

export function DropForm({ editMode, dropId, initialData }: DropFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [date, setDate] = useState(initialData?.date ?? "");
  const [launchTime, setLaunchTime] = useState(initialData?.launchTime ?? "20:00");
  const [viewersBase, setViewersBase] = useState(initialData?.viewersBase ?? 100);
  const [messagesBase, setMessagesBase] = useState(initialData?.messagesBase ?? 30);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>(
    initialData?.items ?? []
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const { data: pecasData } = useQuery(
    trpc.peca.list.queryOptions(
      { page: 1, limit: 10, search: searchTerm },
      { enabled: showSearch && searchTerm.length >= 2 }
    )
  );

  const pecas = (pecasData as { pecas: PecaResult[]; total: number } | undefined)?.pecas ?? [];

  const createMutation = useMutation(
    trpc.drop.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.drop.list.queryKey() });
        toast.success("Drop criado com sucesso");
        router.push("/drop-do-dia" as Route);
      },
      onError: (error: { message: string }) => {
        toast.error(error.message);
      },
    })
  );

  const updateMutation = useMutation(
    trpc.drop.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.drop.list.queryKey() });
        toast.success("Drop atualizado com sucesso");
        router.push("/drop-do-dia" as Route);
      },
      onError: (error: { message: string }) => {
        toast.error(error.message);
      },
    })
  );

  function handleSelectPeca(peca: PecaResult) {
    if (selectedItems.length >= 3) {
      toast.error("Máximo de 3 peças por drop");
      return;
    }
    if (selectedItems.some((item) => item.pecaId === peca.id)) {
      toast.error("Peça já adicionada");
      return;
    }
    setSelectedItems((prev) => [
      ...prev,
      {
        pecaId: peca.id,
        dropPrice: Number(peca.valorEstimadoVenda),
        peca,
      },
    ]);
    setSearchTerm("");
    setShowSearch(false);
  }

  function handleRemovePeca(pecaId: string) {
    setSelectedItems((prev) => prev.filter((item) => item.pecaId !== pecaId));
  }

  function handlePriceChange(pecaId: string, price: number) {
    setSelectedItems((prev) =>
      prev.map((item) =>
        item.pecaId === pecaId ? { ...item, dropPrice: price } : item
      )
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!date) {
      toast.error("Selecione a data do drop");
      return;
    }
    if (selectedItems.length === 0) {
      toast.error("Adicione pelo menos 1 peça ao drop");
      return;
    }
    if (selectedItems.length > 3) {
      toast.error("Máximo de 3 peças por drop");
      return;
    }

    const payload = {
      date: new Date(date + "T00:00:00").toISOString(),
      launchTime,
      viewersBase,
      messagesBase,
      items: selectedItems.map((item) => ({
        pecaId: item.pecaId,
        dropPrice: item.dropPrice,
      })),
    };

    if (editMode && dropId) {
      updateMutation.mutate({ id: dropId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-6 max-w-2xl">
        {/* Date & Time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Data e Horário</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Data do Drop</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="launchTime">Horário de Lançamento</Label>
              <Input
                id="launchTime"
                type="time"
                value={launchTime}
                onChange={(e) => setLaunchTime(e.target.value)}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Engagement */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Indicadores de Engajamento</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="viewersBase">Patamar de Viewers</Label>
              <Input
                id="viewersBase"
                type="number"
                min={0}
                value={viewersBase}
                onChange={(e) => setViewersBase(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Base para número fictício de pessoas online
              </p>
            </div>
            <div>
              <Label htmlFor="messagesBase">Patamar de Mensagens</Label>
              <Input
                id="messagesBase"
                type="number"
                min={0}
                value={messagesBase}
                onChange={(e) => setMessagesBase(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Base para número fictício de mensagens
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Piece Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Peças do Drop ({selectedItems.length}/3)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Selected pieces */}
            {selectedItems.length > 0 && (
              <div className="space-y-3 mb-4">
                {selectedItems.map((item) => {
                  const fotoUrl = item.peca?.fotos?.[0]?.url;
                  return (
                    <div
                      key={item.pecaId}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-white"
                    >
                      {fotoUrl ? (
                        <img
                          src={fotoUrl}
                          alt={`${item.peca?.marca} ${item.peca?.modelo}`}
                          className="h-12 w-12 rounded object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded bg-gray-100 flex items-center justify-center">
                          <ImageIcon className="h-5 w-5 text-gray-400" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {item.peca?.marca} {item.peca?.modelo}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.peca?.sku}
                        </p>
                      </div>

                      <div className="w-36">
                        <Label className="text-xs">Preço Drop</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          value={item.dropPrice}
                          onChange={(e) =>
                            handlePriceChange(item.pecaId, Number(e.target.value))
                          }
                        />
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemovePeca(item.pecaId)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Search */}
            {selectedItems.length < 3 && (
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar peça por SKU, marca ou modelo..."
                    className="pl-9"
                    value={searchTerm}
                    onFocus={() => setShowSearch(true)}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowSearch(true);
                    }}
                  />
                </div>

                {showSearch && searchTerm.length >= 2 && pecas.length > 0 && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {pecas.map((peca) => {
                      const fotoUrl = peca.fotos?.[0]?.url;
                      return (
                        <button
                          key={peca.id}
                          type="button"
                          className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left"
                          onClick={() => handleSelectPeca(peca)}
                        >
                          {fotoUrl ? (
                            <img
                              src={fotoUrl}
                              alt={`${peca.marca} ${peca.modelo}`}
                              className="h-10 w-10 rounded object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded bg-gray-100 flex items-center justify-center">
                              <ImageIcon className="h-4 w-4 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium">
                              {peca.marca} {peca.modelo}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {peca.sku} -{" "}
                              {Number(peca.valorEstimadoVenda).toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {showSearch && searchTerm.length >= 2 && pecas.length === 0 && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg p-4 text-center text-sm text-muted-foreground">
                    Nenhuma peça encontrada
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending
              ? "Salvando..."
              : editMode
                ? "Salvar Alterações"
                : "Criar Drop"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/drop-do-dia" as Route)}
          >
            Cancelar
          </Button>
        </div>
      </div>
    </form>
  );
}
