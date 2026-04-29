"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageCircle,
  Mail,
  Linkedin,
  Archive,
  Loader2,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/utils/trpc";
import {
  STATUS_LIST,
  STATUS_MAP,
  FAIXA_RENDA_LABEL,
  OBJETIVO_COMUNIDADE_LABEL,
  OBJETIVO_COMUNIDADE_BADGE_CLASS,
  type StatusLead,
  type FaixaRendaAnualVip,
  type ObjetivoComunidadeVip,
} from "./constants";
import { StatusBadge } from "./status-badge";
import { cn } from "@/lib/utils";

interface VipLeadDetailSheetProps {
  leadId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VipLeadDetailSheet({ leadId, open, onOpenChange }: VipLeadDetailSheetProps) {
  const queryClient = useQueryClient();
  const [novaNota, setNovaNota] = useState("");

  const { data: lead, isLoading } = useQuery({
    ...trpc.leadVip.getById.queryOptions(
      { id: leadId ?? "" },
      { enabled: Boolean(leadId) && open },
    ),
  });

  const invalidateLead = () => {
    queryClient.invalidateQueries({
      queryKey: [["leadVip", "getById"], { input: { id: leadId } }],
    });
    queryClient.invalidateQueries({ queryKey: [["leadVip", "list"]] });
    queryClient.invalidateQueries({ queryKey: [["leadVip", "stats"]] });
  };

  const updateStatusMutation = useMutation(
    trpc.leadVip.updateStatus.mutationOptions({
      onSuccess: () => {
        toast.success("Status atualizado");
        invalidateLead();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const addNotaMutation = useMutation(
    trpc.leadVip.addNota.mutationOptions({
      onSuccess: () => {
        toast.success("Nota adicionada");
        setNovaNota("");
        invalidateLead();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const archiveMutation = useMutation(
    trpc.leadVip.archive.mutationOptions({
      onSuccess: () => {
        toast.success("Lead arquivado");
        invalidateLead();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const handleAddNota = () => {
    if (!leadId || !novaNota.trim()) return;
    addNotaMutation.mutate({ id: leadId, conteudo: novaNota.trim() });
  };

  const celularDigits = lead?.celular.replace(/\D/g, "") ?? "";
  const waHref = celularDigits ? `https://wa.me/${celularDigits}` : undefined;
  const emailHref = lead?.email ? `mailto:${lead.email}` : undefined;
  const linkedinHref = lead?.linkedinUrl ?? undefined;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col">
        {isLoading || !lead ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <>
            {/* Header */}
            <SheetHeader className="p-6 pb-4 border-b">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <SheetTitle className="text-xl truncate">{lead.nome}</SheetTitle>
                  <SheetDescription className="mt-1 flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">
                      VIP Chrono
                    </Badge>
                    <span className="text-xs">
                      Recebido{" "}
                      {formatDistanceToNow(new Date(lead.createdAt), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </SheetDescription>
                </div>
              </div>

              {/* Status dropdown editável */}
              <div className="flex items-center gap-3 mt-4">
                <label className="text-sm text-muted-foreground">Status</label>
                <Select
                  value={lead.status}
                  onValueChange={(v) =>
                    leadId && updateStatusMutation.mutate({ id: leadId, status: v as StatusLead })
                  }
                  disabled={updateStatusMutation.isPending}
                >
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_LIST.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        <div className="flex items-center gap-2">
                          <span className={cn("w-2 h-2 rounded-full", s.dot)} />
                          {s.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {updateStatusMutation.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* Ações rápidas */}
              <div className="flex flex-wrap gap-2 mt-4">
                {waHref ? (
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({ size: "sm", variant: "outline" })}
                  >
                    <MessageCircle className="w-4 h-4 mr-1.5" />
                    WhatsApp
                  </a>
                ) : null}
                {emailHref ? (
                  <a
                    href={emailHref}
                    className={buttonVariants({ size: "sm", variant: "outline" })}
                  >
                    <Mail className="w-4 h-4 mr-1.5" />
                    E-mail
                  </a>
                ) : null}
                {linkedinHref && (
                  <a
                    href={linkedinHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({ size: "sm", variant: "outline" })}
                  >
                    <Linkedin className="w-4 h-4 mr-1.5" />
                    LinkedIn
                  </a>
                )}
                {lead.status !== "ARQUIVADO" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground ml-auto"
                    disabled={archiveMutation.isPending}
                    onClick={() =>
                      leadId &&
                      archiveMutation.mutate({ id: leadId })
                    }
                  >
                    <Archive className="w-4 h-4 mr-1.5" />
                    Arquivar
                  </Button>
                )}
              </div>
            </SheetHeader>

            {/* Body scroll */}
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-8">
                {/* Dados pessoais */}
                <Section title="Dados pessoais">
                  <InfoRow label="Nome" value={lead.nome} />
                  <InfoRow
                    label="E-mail"
                    value={
                      emailHref ? (
                        <a href={emailHref} className="text-primary hover:underline break-all">
                          {lead.email}
                        </a>
                      ) : (
                        lead.email
                      )
                    }
                  />
                  <InfoRow
                    label="Celular"
                    value={
                      waHref ? (
                        <a
                          href={waHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {lead.celular}
                        </a>
                      ) : (
                        lead.celular
                      )
                    }
                  />
                  <InfoRow
                    label="Nascimento"
                    value={format(new Date(lead.nascimento), "dd/MM/yyyy", { locale: ptBR })}
                  />
                  <InfoRow label="Profissão" value={lead.profissao} />
                  <InfoRow
                    label="Renda anual"
                    value={FAIXA_RENDA_LABEL[lead.faixaRendaAnual as FaixaRendaAnualVip]}
                  />
                  {lead.linkedinUrl && (
                    <InfoRow
                      label="LinkedIn"
                      value={
                        <a
                          href={lead.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline break-all"
                        >
                          {lead.linkedinUrl}
                        </a>
                      }
                    />
                  )}
                </Section>

                <Separator />

                {/* Coleção */}
                <Section title="Coleção">
                  <InfoRow
                    label="Já coleciona?"
                    value={lead.jaColeciona ? "Sim" : "Não"}
                  />
                  {lead.jaColeciona && lead.marcasColecao.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Marcas na coleção</p>
                      <TagList items={lead.marcasColecao} />
                    </div>
                  )}
                  {lead.marcaPreferida && (
                    <InfoRow label="Marca preferida" value={lead.marcaPreferida} />
                  )}
                  {lead.relogioDosSonhos && (
                    <div className="pt-2">
                      <p className="text-xs text-muted-foreground mb-1">Relógio dos sonhos</p>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed bg-muted/40 p-3 rounded-md">
                        {lead.relogioDosSonhos}
                      </p>
                    </div>
                  )}
                  {lead.maximoPagoRelogio && (
                    <InfoRow label="Máximo já pago" value={lead.maximoPagoRelogio} />
                  )}
                </Section>

                <Separator />

                {/* Comunidade */}
                <Section title="Objetivos com a comunidade">
                  {lead.objetivosComunidade.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">
                      Nenhum objetivo informado.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {lead.objetivosComunidade.map((o) => {
                        const obj = o as ObjetivoComunidadeVip;
                        return (
                          <span
                            key={o}
                            className={cn(
                              "inline-flex items-center px-2.5 py-1 rounded-md border text-xs font-medium",
                              OBJETIVO_COMUNIDADE_BADGE_CLASS[obj],
                            )}
                          >
                            {OBJETIVO_COMUNIDADE_LABEL[obj] ?? o}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </Section>

                <Separator />

                {/* Notas internas */}
                <Section title="Notas internas">
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Adicione uma anotação para a equipe..."
                      value={novaNota}
                      onChange={(e) => setNovaNota(e.target.value)}
                      rows={3}
                      maxLength={2000}
                    />
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={handleAddNota}
                        disabled={!novaNota.trim() || addNotaMutation.isPending}
                      >
                        {addNotaMutation.isPending && (
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        )}
                        Salvar nota
                      </Button>
                    </div>
                  </div>

                  {lead.notas.length === 0 ? (
                    <p className="text-sm text-muted-foreground mt-4 italic">
                      Nenhuma nota registrada.
                    </p>
                  ) : (
                    <ul className="mt-4 space-y-3">
                      {lead.notas.map((nota) => (
                        <li
                          key={nota.id}
                          className="p-3 rounded-md bg-muted/40 border border-border/50"
                        >
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">
                            {nota.conteudo}
                          </p>
                          <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                            <FileText className="w-3 h-3" />
                            <span className="font-medium">{nota.user?.name ?? "—"}</span>
                            <span>·</span>
                            <span>
                              {format(new Date(nota.createdAt), "dd/MM/yyyy 'às' HH:mm", {
                                locale: ptBR,
                              })}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </Section>

                <Separator />

                {/* Histórico de status */}
                <Section title="Histórico de status">
                  {lead.historicoStatus.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">
                      Nenhum histórico registrado.
                    </p>
                  ) : (
                    <ol className="relative border-l border-border ml-2">
                      {lead.historicoStatus.map((h) => {
                        const info = STATUS_MAP[h.statusNovo as StatusLead];
                        const anterior = h.statusAnterior
                          ? STATUS_MAP[h.statusAnterior as StatusLead]
                          : null;
                        return (
                          <li key={h.id} className="mb-5 ml-4">
                            <span
                              className={cn(
                                "absolute -left-[5px] flex items-center justify-center w-2.5 h-2.5 rounded-full ring-4 ring-background",
                                info.dot,
                              )}
                            />
                            <div className="flex items-center gap-2 flex-wrap text-sm">
                              {anterior && (
                                <>
                                  <span className="text-muted-foreground">
                                    {anterior.label}
                                  </span>
                                  <span className="text-muted-foreground">→</span>
                                </>
                              )}
                              <StatusBadge status={h.statusNovo as StatusLead} />
                            </div>
                            <div className="mt-1 text-[11px] text-muted-foreground">
                              {format(new Date(h.createdAt), "dd/MM/yyyy 'às' HH:mm", {
                                locale: ptBR,
                              })}
                              {h.user?.name && <> · {h.user.name}</>}
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </Section>
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ==============================
// Sub-componentes internos
// ==============================
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-xs font-semibold tracking-wide uppercase text-muted-foreground mb-3">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}

function TagList({ items }: { items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((v) => (
        <span
          key={v}
          className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-xs"
        >
          {v}
        </span>
      ))}
    </div>
  );
}
