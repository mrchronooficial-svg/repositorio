"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Download, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { trpc } from "@/utils/trpc";

// ----------------------------------------------------------------------------
// Constantes
// ----------------------------------------------------------------------------

const MES_ABBR = [
  "", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];
const MES_NOME = [
  "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// Mês a partir do qual o sistema passou a ter dados (início do projeto)
const PRIMEIRO_ANO = 2026;
const PRIMEIRO_MES = 1;

// ----------------------------------------------------------------------------
// Tipos do retorno da exportação (espelham o serviço de demonstrativos)
// ----------------------------------------------------------------------------

type LinhaDRE = {
  codigo: string;
  nome: string;
  valor: number;
  nivel: number;
  negrito?: boolean;
};
type LinhaBalanco = {
  codigo: string;
  nome: string;
  valor: number;
  nivel: number;
  negrito?: boolean;
};
type LinhaDFC = {
  descricao: string;
  valor: number;
  nivel: number;
  negrito?: boolean;
};
type MesExport = {
  mes: number;
  ano: number;
  periodo: string;
  dre: { linhas: LinhaDRE[] };
  balanco: { ativo: LinhaBalanco[]; passivo: LinhaBalanco[] };
  dfc: { linhas: LinhaDFC[] };
  kpis: {
    unidadesPropriasVendidas: number;
    unidadesConsignadasVendidas: number;
    estoquePropriasFimMes: number;
    estoqueConsignadasFimMes: number;
  };
};

// Linha já montada para a planilha (rótulo + valor por mês)
type LinhaPlanilha = {
  label: string;
  nivel: number;
  values: (number | string)[];
};

// ----------------------------------------------------------------------------
// Merge: alinha as linhas de uma seção entre vários meses, preservando a ordem.
// Cada mês pode ter linhas dinâmicas (ex: despesas que só aparecem em alguns
// meses); o merge insere cada chave nova logo após a última chave já conhecida.
// ----------------------------------------------------------------------------

function mergeSecao<T>(
  perMonth: T[][],
  keyOf: (r: T) => string,
  labelOf: (r: T) => string,
  nivelOf: (r: T) => number,
  valorOf: (r: T) => number | string
): LinhaPlanilha[] {
  const order: string[] = [];
  const meta = new Map<string, { label: string; nivel: number }>();

  for (const rows of perMonth) {
    let insertPos = 0;
    for (const r of rows) {
      const k = keyOf(r);
      const idx = order.indexOf(k);
      if (idx === -1) {
        order.splice(insertPos, 0, k);
        meta.set(k, { label: labelOf(r), nivel: nivelOf(r) });
        insertPos++;
      } else {
        insertPos = idx + 1;
      }
    }
  }

  return order.map((k) => {
    const m = meta.get(k)!;
    const values = perMonth.map((rows) => {
      const r = rows.find((x) => keyOf(x) === k);
      return r ? valorOf(r) : "";
    });
    return { label: m.label, nivel: m.nivel, values };
  });
}

// ----------------------------------------------------------------------------
// Componente
// ----------------------------------------------------------------------------

export function ExportarDemonstrativosButton() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(() => {
    const now = new Date();
    return new Set([`${now.getFullYear()}-${now.getMonth() + 1}`]);
  });

  // Lista de meses disponíveis: do início do projeto até o mês atual (mais recente primeiro)
  const mesesDisponiveis = useMemo(() => {
    const now = new Date();
    const anoAtual = now.getFullYear();
    const mesAtual = now.getMonth() + 1;
    const lista: { ano: number; mes: number; key: string; label: string }[] = [];
    let ano = PRIMEIRO_ANO;
    let mes = PRIMEIRO_MES;
    while (ano < anoAtual || (ano === anoAtual && mes <= mesAtual)) {
      lista.push({
        ano,
        mes,
        key: `${ano}-${mes}`,
        label: `${MES_NOME[mes]} ${ano}`,
      });
      mes++;
      if (mes > 12) {
        mes = 1;
        ano++;
      }
    }
    return lista.reverse();
  }, []);

  const toggle = (key: string) => {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selecionarTodos = () =>
    setSelecionados(new Set(mesesDisponiveis.map((m) => m.key)));
  const limparTodos = () => setSelecionados(new Set());

  const exportar = async () => {
    // Meses selecionados, ordenados do mais antigo para o mais recente
    const meses = mesesDisponiveis
      .filter((m) => selecionados.has(m.key))
      .map((m) => ({ mes: m.mes, ano: m.ano }))
      .sort((a, b) => a.ano - b.ano || a.mes - b.mes);

    if (meses.length === 0) {
      toast.error("Selecione pelo menos um mês");
      return;
    }

    setIsExporting(true);
    try {
      const dados = (await queryClient.fetchQuery(
        trpc.financeiro.exportDemonstrativos.queryOptions({ meses })
      )) as unknown as MesExport[];

      const labelsMeses = dados.map((m) => `${MES_ABBR[m.mes]}/${m.ano}`);
      const aoa: (string | number)[][] = [];

      const titulo = (texto: string) => aoa.push([texto]);
      const empilhar = (linhas: LinhaPlanilha[]) => {
        for (const l of linhas) {
          const indent = "    ".repeat(Math.max(0, l.nivel));
          aoa.push([indent + l.label, ...l.values]);
        }
      };

      // Cabeçalho
      aoa.push(["Demonstrativos Financeiros — Mr. Chrono"]);
      aoa.push([]);
      aoa.push(["", ...labelsMeses]);
      aoa.push([]);

      // DRE
      titulo("DRE — DEMONSTRAÇÃO DO RESULTADO");
      empilhar(
        mergeSecao<LinhaDRE>(
          dados.map((m) => m.dre.linhas.filter((l) => l.nivel !== -1)),
          (l) => l.codigo || l.nome,
          (l) => l.nome,
          (l) => l.nivel,
          (l) => l.valor
        )
      );
      aoa.push([]);

      // Balanço Patrimonial (ativo + passivo, cada um já traz seu cabeçalho)
      titulo("BALANÇO PATRIMONIAL");
      empilhar(
        mergeSecao<LinhaBalanco>(
          dados.map((m) => m.balanco.ativo),
          (l) => l.codigo || l.nome,
          (l) => l.nome,
          (l) => l.nivel,
          (l) => l.valor
        )
      );
      empilhar(
        mergeSecao<LinhaBalanco>(
          dados.map((m) => m.balanco.passivo),
          (l) => l.codigo || l.nome,
          (l) => l.nome,
          (l) => l.nivel,
          (l) => l.valor
        )
      );
      aoa.push([]);

      // Fluxo de Caixa (DFC) — linhas de título (valor 0) ficam sem valor
      titulo("FLUXO DE CAIXA (DFC)");
      empilhar(
        mergeSecao<LinhaDFC>(
          dados.map((m) => m.dfc.linhas.filter((l) => l.nivel !== -1)),
          (l) => l.descricao,
          (l) => l.descricao,
          (l) => l.nivel,
          (l) =>
            l.valor === 0 && (l.nivel === 0 || l.descricao.endsWith(":"))
              ? ""
              : l.valor
        )
      );
      aoa.push([]);

      // KPIs operacionais
      titulo("KPIs OPERACIONAIS");
      aoa.push([
        "Unidades próprias vendidas no mês",
        ...dados.map((m) => m.kpis.unidadesPropriasVendidas),
      ]);
      aoa.push([
        "Unidades consignadas vendidas no mês",
        ...dados.map((m) => m.kpis.unidadesConsignadasVendidas),
      ]);
      aoa.push([
        "Estoque de unidades próprias (foto fim do mês)",
        ...dados.map((m) => m.kpis.estoquePropriasFimMes),
      ]);
      aoa.push([
        "Estoque de unidades consignadas (foto fim do mês)",
        ...dados.map((m) => m.kpis.estoqueConsignadasFimMes),
      ]);

      // Montar planilha
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws["!cols"] = [
        { wch: 48 },
        ...labelsMeses.map(() => ({ wch: 16 })),
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Demonstrativos");

      const primeiro = dados[0];
      const ultimo = dados[dados.length - 1];
      const sufixo =
        dados.length === 1
          ? `${primeiro.ano}-${String(primeiro.mes).padStart(2, "0")}`
          : `${primeiro.ano}-${String(primeiro.mes).padStart(2, "0")}_a_${ultimo.ano}-${String(ultimo.mes).padStart(2, "0")}`;

      XLSX.writeFile(wb, `demonstrativos-mrchrono-${sufixo}.xlsx`);
      toast.success("Planilha exportada com sucesso!");
      setOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao exportar";
      toast.error(msg);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar demonstrativos</DialogTitle>
          <DialogDescription>
            Selecione os meses. Cada mês vira uma coluna na planilha, com DRE,
            Balanço, Fluxo de Caixa e KPIs empilhados.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {selecionados.size} mês(es) selecionado(s)
          </span>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={selecionarTodos}
              className="text-primary hover:underline"
            >
              Selecionar todos
            </button>
            <button
              type="button"
              onClick={limparTodos}
              className="text-muted-foreground hover:underline"
            >
              Limpar
            </button>
          </div>
        </div>

        <ScrollArea className="h-64 rounded-md border p-2">
          <div className="space-y-1">
            {mesesDisponiveis.map((m) => (
              <label
                key={m.key}
                className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50 cursor-pointer"
              >
                <Checkbox
                  checked={selecionados.has(m.key)}
                  onCheckedChange={() => toggle(m.key)}
                />
                <span className="text-sm">{m.label}</span>
              </label>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isExporting}
          >
            Cancelar
          </Button>
          <Button
            onClick={exportar}
            disabled={isExporting || selecionados.size === 0}
            className="gap-2"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Exportar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
