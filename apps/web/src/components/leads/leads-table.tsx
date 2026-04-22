"use client";

import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle } from "lucide-react";
import { StatusBadge } from "./status-badge";
import { TIPO_BUSCA_LABEL, type StatusLead, type TipoBuscaLead } from "./constants";
import { cn } from "@/lib/utils";

interface LeadRow {
  id: string;
  status: StatusLead;
  nome: string;
  email: string;
  whatsapp: string;
  instagram: string | null;
  tipoBusca: TipoBuscaLead;
  modeloMarca: string | null;
  modeloNome: string | null;
  descobertaMarcasInteresse: string[];
  createdAt: string | Date;
}

interface LeadsTableProps {
  leads: LeadRow[];
  isLoading: boolean;
  selecionados: Set<string>;
  onToggleSelecionado: (id: string) => void;
  onToggleTodos: () => void;
  todosSelecionados: boolean;
  onRowClick: (id: string) => void;
}

export function LeadsTable({
  leads,
  isLoading,
  selecionados,
  onToggleSelecionado,
  onToggleTodos,
  todosSelecionados,
  onRowClick,
}: LeadsTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="border rounded-lg p-12 text-center">
        <p className="text-muted-foreground">Nenhum lead encontrado.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={todosSelecionados}
                onCheckedChange={onToggleTodos}
                aria-label="Selecionar todos"
              />
            </TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Marca(s)</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>WhatsApp</TableHead>
            <TableHead className="text-right">Recebido</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => {
            const marcas = resumoMarcas(lead);
            const waDigits = lead.whatsapp.replace(/\D/g, "");
            const isSelecionado = selecionados.has(lead.id);
            return (
              <TableRow
                key={lead.id}
                className={cn(
                  "cursor-pointer transition-colors",
                  isSelecionado && "bg-amber-50/40 hover:bg-amber-50/60",
                )}
                onClick={() => onRowClick(lead.id)}
              >
                <TableCell
                  onClick={(e) => e.stopPropagation()}
                  className="w-10"
                >
                  <Checkbox
                    checked={isSelecionado}
                    onCheckedChange={() => onToggleSelecionado(lead.id)}
                    aria-label={`Selecionar lead ${lead.nome}`}
                  />
                </TableCell>
                <TableCell>
                  <div className="font-medium">{lead.nome}</div>
                  <div className="text-xs text-muted-foreground truncate max-w-[220px]">
                    {lead.email}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      "font-normal",
                      lead.tipoBusca === "ESPECIFICO"
                        ? "border-violet-200 bg-violet-50 text-violet-800"
                        : "border-teal-200 bg-teal-50 text-teal-800",
                    )}
                  >
                    {TIPO_BUSCA_LABEL[lead.tipoBusca]}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[260px]">
                  <span className="text-sm text-foreground/80 line-clamp-1">
                    {marcas || "—"}
                  </span>
                </TableCell>
                <TableCell>
                  <StatusBadge status={lead.status} />
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {waDigits ? (
                    <a
                      href={`https://wa.me/${waDigits}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-emerald-700 hover:text-emerald-900 hover:underline"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      {lead.whatsapp}
                    </a>
                  ) : (
                    <span className="text-sm text-muted-foreground">{lead.whatsapp}</span>
                  )}
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(lead.createdAt), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function resumoMarcas(lead: LeadRow): string {
  if (lead.tipoBusca === "ESPECIFICO") {
    const partes = [lead.modeloMarca, lead.modeloNome].filter(Boolean);
    return partes.join(" — ");
  }
  const marcas = lead.descobertaMarcasInteresse ?? [];
  if (marcas.length === 0) return "—";
  if (marcas.length <= 2) return marcas.join(", ");
  return `${marcas.slice(0, 2).join(", ")} +${marcas.length - 2}`;
}
