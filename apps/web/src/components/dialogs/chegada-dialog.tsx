"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, PackageCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/utils/trpc";
import { formatDateOnly } from "@/lib/formatters";
import { toast } from "sonner";

interface ChegadaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function isAtrasada(dataIso: string): boolean {
  // Comparacao por dia-calendario no fuso do Brasil (UTC-3), sem deslocar o dia
  const agoraBR = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const hojeKey = agoraBR.toISOString().slice(0, 10);
  const dataKey = new Date(dataIso).toISOString().slice(0, 10);
  return dataKey < hojeKey;
}

export function ChegadaDialog({ open, onOpenChange }: ChegadaDialogProps) {
  const queryClient = useQueryClient();
  const pendentesOptions = trpc.peca.getChegadasPendentes.queryOptions();
  const { data: pendentes = [], isLoading } = useQuery(pendentesOptions);

  const [novasDatas, setNovasDatas] = useState<Record<string, string>>({});

  const invalidar = () => {
    queryClient.invalidateQueries(trpc.peca.getChegadasPendentes.queryFilter());
    queryClient.invalidateQueries(trpc.peca.getPrevisaoChegadas.queryFilter());
    queryClient.invalidateQueries(trpc.peca.list.queryFilter());
    queryClient.invalidateQueries(trpc.peca.getMetricas.queryFilter());
  };

  const confirmarMutation = useMutation(
    trpc.peca.confirmarChegada.mutationOptions({
      onSuccess: () => {
        toast.success("Chegada confirmada! Peça agora está disponível.");
        invalidar();
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const reagendarMutation = useMutation(
    trpc.peca.reagendarChegada.mutationOptions({
      onSuccess: () => {
        toast.success("Nova data de chegada definida.");
        invalidar();
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const isPending = confirmarMutation.isPending || reagendarMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Chegadas previstas</DialogTitle>
          <DialogDescription>
            Estas peças tinham chegada prevista para hoje ou antes. Confirme a
            chegada ou defina uma nova data.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : pendentes.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <PackageCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhuma chegada pendente. Tudo em dia!</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[420px] overflow-auto pr-1">
            {pendentes.map((peca) => {
              const atrasada = peca.dataEstimadaChegada
                ? isAtrasada(peca.dataEstimadaChegada as unknown as string)
                : false;
              return (
                <div
                  key={peca.id}
                  className="border rounded-lg p-3 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">
                        {peca.marca} {peca.modelo}
                      </p>
                      <p className="text-xs text-muted-foreground">{peca.sku}</p>
                    </div>
                    <span
                      className={
                        atrasada
                          ? "text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded"
                          : "text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded"
                      }
                    >
                      {peca.dataEstimadaChegada
                        ? formatDateOnly(
                            peca.dataEstimadaChegada as unknown as string
                          )
                        : "-"}
                      {atrasada ? " (atrasada)" : ""}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-end gap-2">
                    <Button
                      size="sm"
                      onClick={() => confirmarMutation.mutate({ pecaId: peca.id })}
                      disabled={isPending}
                    >
                      <PackageCheck className="h-4 w-4 mr-1" />
                      Confirmar chegada
                    </Button>

                    <div className="flex items-end gap-2">
                      <Input
                        type="date"
                        className="h-9 w-[150px]"
                        value={novasDatas[peca.id] ?? ""}
                        onChange={(e) =>
                          setNovasDatas((prev) => ({
                            ...prev,
                            [peca.id]: e.target.value,
                          }))
                        }
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending || !novasDatas[peca.id]}
                        onClick={() =>
                          reagendarMutation.mutate({
                            pecaId: peca.id,
                            novaData: novasDatas[peca.id],
                          })
                        }
                      >
                        Nova data
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
