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
import {
  OBJETIVO_COMUNIDADE_BADGE_CLASS,
  OBJETIVO_COMUNIDADE_SHORT,
  type ObjetivoComunidadeVip,
  type StatusLead,
} from "./constants";
import { cn } from "@/lib/utils";

interface VipLeadRow {
  id: string;
  status: StatusLead;
  nome: string;
  email: string;
  celular: string;
  profissao: string;
  jaColeciona: boolean;
  objetivosComunidade: ObjetivoComunidadeVip[];
  createdAt: string | Date;
}

interface VipLeadsTableProps {
  leads: VipLeadRow[];
  isLoading: boolean;
  selecionados: Set<string>;
  onToggleSelecionado: (id: string) => void;
  onToggleTodos: () => void;
  todosSelecionados: boolean;
  onRowClick: (id: string) => void;
}

const MAX_OBJETIVOS_VISIVEIS = 2;

export function VipLeadsTable({
  leads,
  isLoading,
  selecionados,
  onToggleSelecionado,
  onToggleTodos,
  todosSelecionados,
  onRowClick,
}: VipLeadsTableProps) {
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
            <TableHead>Profissão</TableHead>
            <TableHead>Coleciona?</TableHead>
            <TableHead>Objetivos</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Celular</TableHead>
            <TableHead className="text-right">Recebido</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => {
            const waDigits = lead.celular.replace(/\D/g, "");
            const isSelecionado = selecionados.has(lead.id);
            const objetivos = lead.objetivosComunidade ?? [];
            const objetivosVisiveis = objetivos.slice(0, MAX_OBJETIVOS_VISIVEIS);
            const objetivosOcultos = objetivos.length - objetivosVisiveis.length;
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
                  <span className="text-sm text-foreground/80 line-clamp-1">
                    {lead.profissao}
                  </span>
                </TableCell>
                <TableCell>
                  {lead.jaColeciona ? (
                    <Badge
                      variant="outline"
                      className="font-normal border-emerald-200 bg-emerald-50 text-emerald-800"
                    >
                      Sim
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="font-normal border-slate-200 bg-slate-50 text-slate-600"
                    >
                      Não
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="max-w-[260px]">
                  {objetivos.length === 0 ? (
                    <span className="text-xs text-muted-foreground">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {objetivosVisiveis.map((obj) => (
                        <Badge
                          key={obj}
                          variant="outline"
                          className={cn(
                            "font-normal text-[11px]",
                            OBJETIVO_COMUNIDADE_BADGE_CLASS[obj],
                          )}
                        >
                          {OBJETIVO_COMUNIDADE_SHORT[obj]}
                        </Badge>
                      ))}
                      {objetivosOcultos > 0 && (
                        <Badge
                          variant="outline"
                          className="font-normal text-[11px] border-slate-200 bg-slate-50 text-slate-600"
                        >
                          +{objetivosOcultos}
                        </Badge>
                      )}
                    </div>
                  )}
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
                      {lead.celular}
                    </a>
                  ) : (
                    <span className="text-sm text-muted-foreground">{lead.celular}</span>
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
