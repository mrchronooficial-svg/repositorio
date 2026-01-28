"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/utils/trpc";
import { toast } from "sonner";
import { STATUS_PECA_LABELS } from "@/lib/constants";

interface StatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pecaId: string;
  currentStatus: string;
  currentLocalizacao: string;
  onSuccess?: () => void;
}

const TRANSICOES_PERMITIDAS: Record<string, string[]> = {
  DISPONIVEL: ["EM_TRANSITO", "REVISAO", "VENDIDA", "DEFEITO", "PERDA"],
  EM_TRANSITO: ["DISPONIVEL", "REVISAO", "DEFEITO", "PERDA"],
  REVISAO: ["DISPONIVEL", "EM_TRANSITO", "DEFEITO"],
  VENDIDA: ["DISPONIVEL"], // Apenas via devolucao
  DEFEITO: [],
  PERDA: [],
};

export function StatusDialog({
  open,
  onOpenChange,
  pecaId,
  currentStatus,
  currentLocalizacao,
  onSuccess,
}: StatusDialogProps) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState(currentStatus);
  const [localizacao, setLocalizacao] = useState(currentLocalizacao);

  useEffect(() => {
    setStatus(currentStatus);
    setLocalizacao(currentLocalizacao);
  }, [currentStatus, currentLocalizacao]);

  const { data: localizacoes } = useQuery(trpc.peca.getLocalizacoes.queryOptions());

  const updateMutation = useMutation({
    ...trpc.peca.updateStatus.mutationOptions(),
    onSuccess: () => {
      toast.success("Status atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["peca", "getById"] });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = () => {
    if (status === currentStatus && localizacao === currentLocalizacao) {
      toast.info("Nenhuma alteracao foi feita");
      return;
    }

    updateMutation.mutate({
      pecaId,
      status: status as "DISPONIVEL" | "EM_TRANSITO" | "REVISAO" | "VENDIDA" | "DEFEITO" | "PERDA",
      localizacao: localizacao !== currentLocalizacao ? localizacao : undefined,
    });
  };

  const statusDisponiveis = TRANSICOES_PERMITIDAS[currentStatus] || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterar Status da Peca</DialogTitle>
          <DialogDescription>
            Status atual: {STATUS_PECA_LABELS[currentStatus]}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Novo Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={currentStatus}>
                  {STATUS_PECA_LABELS[currentStatus]} (atual)
                </SelectItem>
                {statusDisponiveis.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_PECA_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Localizacao</Label>
            <Select value={localizacao} onValueChange={setLocalizacao}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {localizacoes?.map((loc) => (
                  <SelectItem key={loc} value={loc}>
                    {loc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {currentStatus === "VENDIDA" && status === "DISPONIVEL" && (
            <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded">
              Atencao: Ao retornar uma peca vendida para disponivel, sera gerado
              um novo SKU derivado indicando devolucao.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateMutation.isPending}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
            {updateMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
