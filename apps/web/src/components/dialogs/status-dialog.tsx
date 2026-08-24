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
import { Textarea } from "@/components/ui/textarea";
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
  /** Servico ja registrado, quando a peca ja esta em revisao */
  currentServicoRevisao?: string | null;
  onSuccess?: () => void;
}

// Sugestoes de servico para agilizar o preenchimento (o campo continua livre)
const SUGESTOES_SERVICO = [
  "Revisao padrao",
  "Trocar vidro",
  "Relogio atrasando",
  "Trocar coroa",
  "Trocar pulseira",
  "Polimento",
];

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
  currentServicoRevisao,
  onSuccess,
}: StatusDialogProps) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState(currentStatus);
  const [localizacao, setLocalizacao] = useState(currentLocalizacao);
  const [servicoRevisao, setServicoRevisao] = useState(currentServicoRevisao ?? "");
  const [erroServico, setErroServico] = useState<string | null>(null);

  useEffect(() => {
    setStatus(currentStatus);
    setLocalizacao(currentLocalizacao);
    setServicoRevisao(currentServicoRevisao ?? "");
    setErroServico(null);
  }, [currentStatus, currentLocalizacao, currentServicoRevisao]);

  const { data: localizacoes } = useQuery(trpc.peca.getLocalizacoes.queryOptions());

  const updateMutation = useMutation(
    trpc.peca.updateStatus.mutationOptions({
      onSuccess: () => {
        toast.success("Status atualizado com sucesso!");
        queryClient.invalidateQueries({ queryKey: ["peca", "getById"] });
        onOpenChange(false);
        onSuccess?.();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const isRevisao = status === "REVISAO";
  const servicoLimpo = servicoRevisao.trim();
  const servicoAlterado =
    isRevisao && servicoLimpo !== (currentServicoRevisao ?? "").trim();

  const handleSubmit = () => {
    if (
      status === currentStatus &&
      localizacao === currentLocalizacao &&
      !servicoAlterado
    ) {
      toast.info("Nenhuma alteracao foi feita");
      return;
    }

    // Obrigatorio so na ENTRADA em revisao (mesma regra do servidor)
    if (isRevisao && currentStatus !== "REVISAO" && !servicoLimpo) {
      setErroServico("Descreva o que precisa ser feito na revisao");
      return;
    }

    updateMutation.mutate({
      pecaId,
      status: status as "DISPONIVEL" | "EM_TRANSITO" | "REVISAO" | "VENDIDA" | "DEFEITO" | "PERDA",
      localizacao: localizacao !== currentLocalizacao ? localizacao : undefined,
      // string vazia apagaria o servico ja registrado — envia undefined
      servicoRevisao: isRevisao ? servicoLimpo || undefined : undefined,
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

          {isRevisao && (
            <div className="space-y-2">
              <Label htmlFor="servicoRevisao">
                O que precisa ser feito?{currentStatus !== "REVISAO" && " *"}
              </Label>
              <Textarea
                id="servicoRevisao"
                value={servicoRevisao}
                onChange={(e) => {
                  setServicoRevisao(e.target.value);
                  if (erroServico) setErroServico(null);
                }}
                placeholder="Ex: revisao padrao, trocar vidro, relogio atrasando..."
                rows={3}
                maxLength={500}
              />
              <div className="flex flex-wrap gap-1.5">
                {SUGESTOES_SERVICO.map((sugestao) => (
                  <button
                    key={sugestao}
                    type="button"
                    onClick={() => {
                      setServicoRevisao(sugestao);
                      setErroServico(null);
                    }}
                    className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted"
                  >
                    {sugestao}
                  </button>
                ))}
              </div>
              {erroServico && (
                <p className="text-sm text-red-500">{erroServico}</p>
              )}
            </div>
          )}

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
