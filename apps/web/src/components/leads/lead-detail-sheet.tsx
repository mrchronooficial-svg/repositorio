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
  Instagram,
  Archive,
  Loader2,
  FileText,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/utils/trpc";
import {
  STATUS_LIST,
  STATUS_MAP,
  TIPO_BUSCA_LABEL,
  CONDICAO_LABEL,
  type StatusLead,
} from "./constants";
import { StatusBadge } from "./status-badge";
import { cn } from "@/lib/utils";

interface LeadDetailSheetProps {
  leadId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeadDetailSheet({ leadId, open, onOpenChange }: LeadDetailSheetProps) {
  const queryClient = useQueryClient();
  const [novaNota, setNovaNota] = useState("");

  const { data: lead, isLoading } = useQuery({
    ...trpc.lead.getById.queryOptions(
      { id: leadId ?? "" },
      { enabled: Boolean(leadId) && open },
    ),
  });

  const invalidateLead = () => {
    queryClient.invalidateQueries({ queryKey: [["lead", "getById"], { input: { id: leadId } }] });
    queryClient.invalidateQueries({ queryKey: [["lead", "list"]] });
    queryClient.invalidateQueries({ queryKey: [["lead", "stats"]] });
  };

  const updateStatusMutation = useMutation(
    trpc.lead.updateStatus.mutationOptions({
      onSuccess: () => {
        toast.success("Status atualizado");
        invalidateLead();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const addNotaMutation = useMutation(
    trpc.lead.addNota.mutationOptions({
      onSuccess: () => {
        toast.success("Nota adicionada");
        setNovaNota("");
        invalidateLead();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const archiveMutation = useMutation(
    trpc.lead.archive.mutationOptions({
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

  const whatsappDigits = lead?.whatsapp.replace(/\D/g, "") ?? "";
  const waHref = whatsappDigits ? `https://wa.me/${whatsappDigits}` : undefined;
  const emailHref = lead?.email ? `mailto:${lead.email}` : undefined;
  const instaHref = lead?.instagram
    ? `https://instagram.com/${lead.instagram.replace(/^@/, "")}`
    : undefined;

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
                    <Badge variant="outline">
                      {TIPO_BUSCA_LABEL[lead.tipoBusca as keyof typeof TIPO_BUSCA_LABEL]}
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

              {/* Status dropdown editável inline */}
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
                {instaHref && (
                  <a
                    href={instaHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({ size: "sm", variant: "outline" })}
                  >
                    <Instagram className="w-4 h-4 mr-1.5" />
                    Instagram
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
                    label="WhatsApp"
                    value={
                      waHref ? (
                        <a
                          href={waHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {lead.whatsapp}
                        </a>
                      ) : (
                        lead.whatsapp
                      )
                    }
                  />
                  {lead.instagram && (
                    <InfoRow
                      label="Instagram"
                      value={
                        instaHref ? (
                          <a
                            href={instaHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            @{lead.instagram}
                          </a>
                        ) : (
                          `@${lead.instagram}`
                        )
                      }
                    />
                  )}
                  <InfoRow
                    label="Aceite comunicação"
                    value={
                      lead.aceiteComunicacao ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700">
                          <Check className="w-3.5 h-3.5" /> Sim
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-500">
                          <X className="w-3.5 h-3.5" /> Não
                        </span>
                      )
                    }
                  />
                </Section>

                <Separator />

                {/* Preferências — Watch Fit */}
                <Section title="Watch Fit — Preferências">
                  {lead.tipoBusca === "ESPECIFICO" ? (
                    <EspecificoView
                      marca={lead.modeloMarca}
                      modelo={lead.modeloNome}
                      tamanho={lead.modeloTamanhoCaixa}
                      referencia={lead.modeloReferencia}
                      condicao={lead.modeloCondicao}
                      link={lead.modeloLinkExemplo}
                      observacoes={lead.modeloObservacoes}
                    />
                  ) : (
                    <DescobertaView
                      estilo={lead.descobertaEstilo}
                      marcas={lead.descobertaMarcasInteresse}
                      pulseira={lead.descobertaTipoPulseira}
                      cores={lead.descobertaCorMostrador}
                      tamanho={lead.descobertaTamanhoCaixa}
                      faixa={lead.descobertaFaixaInvestimento}
                      observacoes={lead.descobertaObservacoes}
                    />
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

function EspecificoView({
  marca,
  modelo,
  tamanho,
  referencia,
  condicao,
  link,
  observacoes,
}: {
  marca: string | null;
  modelo: string | null;
  tamanho: string | null;
  referencia: string | null;
  condicao: string | null;
  link: string | null;
  observacoes: string | null;
}) {
  return (
    <>
      <InfoRow label="Marca" value={marca ?? "—"} />
      <InfoRow label="Modelo" value={modelo ?? "—"} />
      {tamanho && <InfoRow label="Tamanho" value={tamanho} />}
      {referencia && <InfoRow label="Referência" value={referencia} />}
      <InfoRow
        label="Condição"
        value={condicao ? CONDICAO_LABEL[condicao] ?? condicao : "—"}
      />
      {link && (
        <InfoRow
          label="Link"
          value={
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline break-all"
            >
              {link}
            </a>
          }
        />
      )}
      {observacoes && (
        <div className="pt-2">
          <p className="text-xs text-muted-foreground mb-1">Observações</p>
          <p className="text-sm whitespace-pre-wrap leading-relaxed bg-muted/40 p-3 rounded-md">
            {observacoes}
          </p>
        </div>
      )}
    </>
  );
}

function DescobertaView({
  estilo,
  marcas,
  pulseira,
  cores,
  tamanho,
  faixa,
  observacoes,
}: {
  estilo: string[];
  marcas: string[];
  pulseira: string[];
  cores: string[];
  tamanho: string | null;
  faixa: string | null;
  observacoes: string | null;
}) {
  const hasNothing =
    estilo.length === 0 &&
    marcas.length === 0 &&
    pulseira.length === 0 &&
    cores.length === 0 &&
    !tamanho &&
    !faixa &&
    !observacoes;

  if (hasNothing) {
    return (
      <p className="text-sm text-muted-foreground italic">
        Sem preferências informadas pelo cliente.
      </p>
    );
  }

  return (
    <>
      {estilo.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">Estilo</p>
          <TagList items={estilo} />
        </div>
      )}
      {marcas.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">Marcas de interesse</p>
          <TagList items={marcas} />
        </div>
      )}
      {pulseira.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">Pulseira</p>
          <TagList items={pulseira} />
        </div>
      )}
      {cores.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">Cor do mostrador</p>
          <TagList items={cores} />
        </div>
      )}
      {tamanho && <InfoRow label="Tamanho" value={tamanho} />}
      {faixa && <InfoRow label="Investimento" value={faixa} />}
      {observacoes && (
        <div className="pt-2">
          <p className="text-xs text-muted-foreground mb-1">Observações</p>
          <p className="text-sm whitespace-pre-wrap leading-relaxed bg-muted/40 p-3 rounded-md">
            {observacoes}
          </p>
        </div>
      )}
    </>
  );
}
