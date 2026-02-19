"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { trpc } from "@/utils/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface LocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pecaId: string;
  currentStatus: string;
  currentLocalizacao: string;
  onSuccess?: () => void;
}

export function LocationDialog({
  open,
  onOpenChange,
  pecaId,
  currentStatus,
  currentLocalizacao,
  onSuccess,
}: LocationDialogProps) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(currentLocalizacao);

  useEffect(() => {
    setSelected(currentLocalizacao);
  }, [currentLocalizacao]);

  const { data: localizacoes } = useQuery(trpc.peca.getLocalizacoes.queryOptions());

  const updateMutation = useMutation(
    trpc.peca.updateStatus.mutationOptions({
      onSuccess: () => {
        toast.success("Localizacao atualizada com sucesso!");
        queryClient.invalidateQueries({ queryKey: ["peca", "list"] });
        queryClient.invalidateQueries({ queryKey: ["peca", "getById"] });
        onOpenChange(false);
        onSuccess?.();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const handleSelect = (loc: string) => {
    if (loc === currentLocalizacao) return;
    setSelected(loc);
    updateMutation.mutate({
      pecaId,
      status: currentStatus as "DISPONIVEL" | "EM_TRANSITO" | "REVISAO" | "VENDIDA" | "DEFEITO" | "PERDA",
      localizacao: loc,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Alterar Localizacao
          </DialogTitle>
          <DialogDescription>
            Localizacao atual: <span className="font-medium">{currentLocalizacao}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 py-4">
          {localizacoes?.map((loc) => (
            <button
              key={loc}
              type="button"
              disabled={updateMutation.isPending}
              onClick={() => handleSelect(loc)}
              className={cn(
                "flex items-center justify-between rounded-lg border px-4 py-3 text-sm transition-colors text-left",
                loc === currentLocalizacao
                  ? "border-primary bg-primary/5 font-medium"
                  : "border-border hover:border-primary/50 hover:bg-muted/50 cursor-pointer",
                updateMutation.isPending && "opacity-50 cursor-not-allowed"
              )}
            >
              <span>{loc}</span>
              {loc === currentLocalizacao && (
                <span className="text-xs text-muted-foreground">(atual)</span>
              )}
              {updateMutation.isPending && selected === loc && loc !== currentLocalizacao && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateMutation.isPending}
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
