"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, RotateCcw, Check, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { trpc } from "@/utils/trpc";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";

interface EditarValorDeclararProps {
  vendaId: string;
  valorDeclarar: number | null;
  /** true quando o valor foi definido a mao (nao recalculado automaticamente) */
  manual: boolean;
  /** Chaves de query a invalidar apos salvar (lista, metricas, detalhe...) */
  queryKeys?: readonly unknown[][];
  /** "inline" para celula de tabela, "bloco" para card de detalhe */
  variante?: "inline" | "bloco";
  /**
   * true quando a venda ja tem NF-e emitida (ou em emissao) pela integracao eNotas.
   * Nesse caso, salvar um valor diferente cancela a nota atual e emite outra.
   */
  temNfe?: boolean;
}

type ResultadoReemissao = {
  cancelamento: { solicitadas: number; falhas: string[] };
  emissao: { emitidas: number; erros: string[]; ignorada?: string };
} | null;

function avisarReemissao(reemissao: ResultadoReemissao) {
  if (!reemissao) return;
  if (reemissao.cancelamento.falhas.length > 0) {
    toast.error("Nao foi possivel cancelar a NF-e anterior. A nova nota NAO foi emitida.");
  } else if (reemissao.emissao.erros.length > 0) {
    toast.error("Nota anterior cancelada, mas houve erro ao emitir a nova NF-e.");
  } else {
    toast.success("NF-e anterior cancelada e nova NF-e enviada para emissao.");
  }
}

// Aceita "3.500,00", "3500.00", "3500"
function parseValor(texto: string): number | null {
  const limpo = texto.trim().replace(/[R$\s]/g, "");
  if (!limpo) return null;
  const normalizado = limpo.includes(",")
    ? limpo.replace(/\./g, "").replace(",", ".")
    : limpo;
  const n = Number(normalizado);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

export function EditarValorDeclarar({
  vendaId,
  valorDeclarar,
  manual,
  queryKeys = [],
  variante = "inline",
  temNfe = false,
}: EditarValorDeclararProps) {
  const queryClient = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");

  // Reabrir sempre partindo do valor atual
  useEffect(() => {
    if (aberto) {
      setTexto(
        valorDeclarar != null
          ? valorDeclarar.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : ""
      );
    }
  }, [aberto, valorDeclarar]);

  function invalidar() {
    for (const key of queryKeys) {
      queryClient.invalidateQueries({ queryKey: key });
    }
  }

  const definirMutation = useMutation(
    trpc.nfe.definirValorDeclarar.mutationOptions({
      onSuccess: (data) => {
        toast.success("Valor a declarar atualizado!");
        avisarReemissao(data.reemissao);
        setAberto(false);
        invalidar();
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const voltarMutation = useMutation(
    trpc.nfe.voltarValorAutomatico.mutationOptions({
      onSuccess: (data) => {
        toast.success("Valor a declarar voltou ao calculo automatico!");
        avisarReemissao(data.reemissao);
        setAberto(false);
        invalidar();
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const salvando = definirMutation.isPending || voltarMutation.isPending;
  const valorParseado = parseValor(texto);
  const podeSalvar = valorParseado !== null && !salvando;

  function salvar() {
    if (valorParseado === null) {
      toast.error("Valor invalido");
      return;
    }
    definirMutation.mutate({ vendaId, valor: valorParseado, reemitirNfe: temNfe });
  }

  return (
    <div
      className={
        variante === "inline"
          ? "flex items-center gap-1.5"
          : "flex items-center gap-2"
      }
    >
      <span
        className={
          variante === "inline"
            ? "font-medium"
            : "font-medium text-orange-600"
        }
      >
        {valorDeclarar != null ? formatCurrency(valorDeclarar) : "-"}
      </span>

      {manual && (
        <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
          manual
        </Badge>
      )}

      <Popover open={aberto} onOpenChange={setAberto}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            title="Editar valor a declarar"
          >
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="start">
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">Valor a declarar</p>
              <p className="text-xs text-muted-foreground">
                {manual
                  ? "Definido a mao. Editar a venda nao altera este valor."
                  : "Calculado automaticamente pela regra padrao."}
              </p>
            </div>

            <Input
              autoFocus
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && podeSalvar) salvar();
                if (e.key === "Escape") setAberto(false);
              }}
              placeholder="0,00"
              inputMode="decimal"
            />

            {temNfe && (
              <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  Esta venda ja tem NF-e. Se o valor mudar, a nota atual sera cancelada
                  (ou anulada por nota de devolucao, se passou de 24h) e uma nova NF-e
                  sera emitida com o novo valor.
                </span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="flex-1"
                onClick={salvar}
                disabled={!podeSalvar}
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                {temNfe ? "Salvar e reemitir" : "Salvar"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setAberto(false)}
                disabled={salvando}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            {manual && (
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => voltarMutation.mutate({ vendaId, reemitirNfe: temNfe })}
                disabled={salvando}
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Voltar ao automatico
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
