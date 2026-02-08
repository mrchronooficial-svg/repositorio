"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, RotateCcw, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { trpc } from "@/utils/trpc";
import { toast } from "sonner";

export default function ParametrosPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [taxaMDR, setTaxaMDR] = useState("");
  const [leadTime, setLeadTime] = useState("");
  const [metaSemanal, setMetaSemanal] = useState("");
  const [diasRelojoeiro, setDiasRelojoeiro] = useState("");
  const [diasAlertaEnvio, setDiasAlertaEnvio] = useState("");

  // Estado para configurações de urgência do catálogo
  const [catalogoConfigs, setCatalogoConfigs] = useState<Record<string, string>>({
    catalogo_urgencia_header_viewers_min: "15",
    catalogo_urgencia_header_viewers_max: "45",
    catalogo_urgencia_viewers_min_baixo: "10",
    catalogo_urgencia_viewers_max_baixo: "20",
    catalogo_urgencia_viewers_min_medio: "15",
    catalogo_urgencia_viewers_max_medio: "30",
    catalogo_urgencia_viewers_min_alto: "25",
    catalogo_urgencia_viewers_max_alto: "45",
    catalogo_urgencia_vendidos_min_baixo: "4",
    catalogo_urgencia_vendidos_max_baixo: "8",
    catalogo_urgencia_vendidos_min_medio: "2",
    catalogo_urgencia_vendidos_max_medio: "5",
    catalogo_urgencia_vendidos_min_alto: "1",
    catalogo_urgencia_vendidos_max_alto: "3",
    catalogo_urgencia_interacoes_min_baixo: "15",
    catalogo_urgencia_interacoes_max_baixo: "30",
    catalogo_urgencia_interacoes_min_medio: "20",
    catalogo_urgencia_interacoes_max_medio: "40",
    catalogo_urgencia_interacoes_min_alto: "30",
    catalogo_urgencia_interacoes_max_alto: "60",
  });

  const queryOptions = trpc.configuracao.getAll.queryOptions();
  const { data: configs, isLoading } = useQuery(queryOptions);

  const catalogoQueryOptions = trpc.catalogoAdmin.getConfiguracoes.queryOptions();
  const { data: catalogoConfigsData } = useQuery(catalogoQueryOptions);

  // Preencher formulario quando configuracoes carregarem
  useEffect(() => {
    if (configs) {
      setTaxaMDR(configs.TAXA_MDR);
      setLeadTime(configs.LEAD_TIME_DIAS);
      setMetaSemanal(configs.META_VENDAS_SEMANAL);
      setDiasRelojoeiro(configs.ALERTA_DIAS_RELOJOEIRO);
      setDiasAlertaEnvio(configs.dias_alerta_envio || "3");
    }
  }, [configs]);

  // Preencher configs do catálogo
  useEffect(() => {
    if (catalogoConfigsData) {
      const mapped: Record<string, string> = {};
      for (const c of catalogoConfigsData) {
        mapped[c.chave] = c.valor;
      }
      setCatalogoConfigs((prev) => ({ ...prev, ...mapped }));
    }
  }, [catalogoConfigsData]);

  const updateMutation = useMutation(
    trpc.configuracao.updateMany.mutationOptions({
      onSuccess: () => {
        toast.success("Configuracoes salvas com sucesso!");
        queryClient.invalidateQueries({ queryKey: queryOptions.queryKey });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const catalogoMutation = useMutation(
    trpc.catalogoAdmin.updateConfiguracoes.mutationOptions({
      onSuccess: () => {
        toast.success("Configuracoes do catalogo salvas com sucesso!");
        queryClient.invalidateQueries({ queryKey: catalogoQueryOptions.queryKey });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const resetMutation = useMutation(
    trpc.configuracao.resetToDefaults.mutationOptions({
      onSuccess: () => {
        toast.success("Configuracoes restauradas para os valores padrao!");
        queryClient.invalidateQueries({ queryKey: queryOptions.queryKey });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validacoes
    const taxaNum = parseFloat(taxaMDR);
    if (isNaN(taxaNum) || taxaNum < 0 || taxaNum > 100) {
      toast.error("Taxa MDR deve ser um numero entre 0 e 100");
      return;
    }

    const leadTimeNum = parseInt(leadTime);
    if (isNaN(leadTimeNum) || leadTimeNum < 1) {
      toast.error("Lead Time deve ser um numero inteiro maior que zero");
      return;
    }

    const metaNum = parseInt(metaSemanal);
    if (isNaN(metaNum) || metaNum < 1) {
      toast.error("Meta Semanal deve ser um numero inteiro maior que zero");
      return;
    }

    const diasNum = parseInt(diasRelojoeiro);
    if (isNaN(diasNum) || diasNum < 1) {
      toast.error("Dias do Relojoeiro deve ser um numero inteiro maior que zero");
      return;
    }

    const diasEnvioNum = parseInt(diasAlertaEnvio);
    if (isNaN(diasEnvioNum) || diasEnvioNum < 1) {
      toast.error("Dias do Alerta de Envio deve ser um numero inteiro maior que zero");
      return;
    }

    // Validar configs do catálogo: min < max para cada par
    const pares = [
      { label: "Header Viewers", min: "catalogo_urgencia_header_viewers_min", max: "catalogo_urgencia_header_viewers_max" },
      { label: "Viewers Baixo", min: "catalogo_urgencia_viewers_min_baixo", max: "catalogo_urgencia_viewers_max_baixo" },
      { label: "Viewers Medio", min: "catalogo_urgencia_viewers_min_medio", max: "catalogo_urgencia_viewers_max_medio" },
      { label: "Viewers Alto", min: "catalogo_urgencia_viewers_min_alto", max: "catalogo_urgencia_viewers_max_alto" },
      { label: "Vendidos Baixo", min: "catalogo_urgencia_vendidos_min_baixo", max: "catalogo_urgencia_vendidos_max_baixo" },
      { label: "Vendidos Medio", min: "catalogo_urgencia_vendidos_min_medio", max: "catalogo_urgencia_vendidos_max_medio" },
      { label: "Vendidos Alto", min: "catalogo_urgencia_vendidos_min_alto", max: "catalogo_urgencia_vendidos_max_alto" },
      { label: "Interacoes Baixo", min: "catalogo_urgencia_interacoes_min_baixo", max: "catalogo_urgencia_interacoes_max_baixo" },
      { label: "Interacoes Medio", min: "catalogo_urgencia_interacoes_min_medio", max: "catalogo_urgencia_interacoes_max_medio" },
      { label: "Interacoes Alto", min: "catalogo_urgencia_interacoes_min_alto", max: "catalogo_urgencia_interacoes_max_alto" },
    ];

    for (const par of pares) {
      const minVal = parseInt(catalogoConfigs[par.min]);
      const maxVal = parseInt(catalogoConfigs[par.max]);
      if (isNaN(minVal) || minVal < 0) {
        toast.error(`${par.label}: valor minimo deve ser um numero inteiro >= 0`);
        return;
      }
      if (isNaN(maxVal) || maxVal < 1) {
        toast.error(`${par.label}: valor maximo deve ser um numero inteiro >= 1`);
        return;
      }
      if (minVal >= maxVal) {
        toast.error(`${par.label}: minimo (${minVal}) deve ser menor que maximo (${maxVal})`);
        return;
      }
    }

    updateMutation.mutate({
      configuracoes: [
        { chave: "TAXA_MDR", valor: taxaMDR },
        { chave: "LEAD_TIME_DIAS", valor: leadTime },
        { chave: "META_VENDAS_SEMANAL", valor: metaSemanal },
        { chave: "ALERTA_DIAS_RELOJOEIRO", valor: diasRelojoeiro },
        { chave: "dias_alerta_envio", valor: diasAlertaEnvio },
      ],
    });

    // Salvar configs do catálogo
    catalogoMutation.mutate({
      configuracoes: Object.entries(catalogoConfigs).map(([chave, valor]) => ({
        chave,
        valor,
      })),
    });
  };

  const handleReset = () => {
    if (
      confirm(
        "Tem certeza que deseja restaurar todas as configuracoes para os valores padrao?"
      )
    ) {
      resetMutation.mutate();
    }
  };

  // Calcular estoque ideal para exibir
  const estoqueIdeal =
    parseInt(metaSemanal) && parseInt(leadTime)
      ? Math.ceil(parseInt(metaSemanal) * (parseInt(leadTime) / 7))
      : 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Parametros" },
        ]}
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/admin")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Parametros do Sistema</h1>
              <p className="text-muted-foreground">
                Configure os parametros operacionais
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Restaurar Padrao
          </Button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Financeiro */}
            <Card>
              <CardHeader>
                <CardTitle>Financeiro</CardTitle>
                <CardDescription>
                  Configuracoes relacionadas a valores e taxas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="taxaMDR">Taxa MDR do Cartao (%)</Label>
                  <Input
                    id="taxaMDR"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={taxaMDR}
                    onChange={(e) => setTaxaMDR(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Taxa aplicada em vendas no cartao de credito
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Estoque */}
            <Card>
              <CardHeader>
                <CardTitle>Estoque</CardTitle>
                <CardDescription>
                  Configuracoes de calculo de estoque ideal
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="leadTime">Lead Time (dias)</Label>
                  <Input
                    id="leadTime"
                    type="number"
                    min="1"
                    value={leadTime}
                    onChange={(e) => setLeadTime(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Tempo medio de reposicao de estoque
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="metaSemanal">Meta de Vendas (pecas/semana)</Label>
                  <Input
                    id="metaSemanal"
                    type="number"
                    min="1"
                    value={metaSemanal}
                    onChange={(e) => setMetaSemanal(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Meta de vendas semanal em pecas
                  </p>
                </div>

                {/* Info box com calculo */}
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                  <div className="flex items-start gap-2">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">
                        Estoque Ideal Calculado: {estoqueIdeal} pecas
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        Formula: Meta Semanal x (Lead Time / 7)
                      </p>
                      <p className="text-xs text-blue-600">
                        {metaSemanal} x ({leadTime} / 7) = {estoqueIdeal}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Alertas */}
            <Card>
              <CardHeader>
                <CardTitle>Alertas</CardTitle>
                <CardDescription>
                  Configuracoes de alertas do sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="diasRelojoeiro">
                    Alerta de Peca no Relojoeiro (dias)
                  </Label>
                  <Input
                    id="diasRelojoeiro"
                    type="number"
                    min="1"
                    value={diasRelojoeiro}
                    onChange={(e) => setDiasRelojoeiro(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Gerar alerta quando peca estiver em revisao ha mais de X dias
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="diasAlertaEnvio">
                    Alerta de Envio Pendente (dias)
                  </Label>
                  <Input
                    id="diasAlertaEnvio"
                    type="number"
                    min="1"
                    value={diasAlertaEnvio}
                    onChange={(e) => setDiasAlertaEnvio(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Gerar alerta quando peca vendida ha mais de X dias nao foi enviada
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Valores padrao */}
            <Card>
              <CardHeader>
                <CardTitle>Valores Padrao</CardTitle>
                <CardDescription>
                  Valores utilizados quando nao configurados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Taxa MDR</span>
                    <span className="font-medium">4%</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Lead Time</span>
                    <span className="font-medium">20 dias</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Meta Semanal</span>
                    <span className="font-medium">10 pecas</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Alerta Relojoeiro</span>
                    <span className="font-medium">14 dias</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Alerta Envio</span>
                    <span className="font-medium">3 dias</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Seção Catálogo */}
          <div className="mt-8 mb-2">
            <h2 className="text-lg font-semibold">Catalogo Publico — Urgencia</h2>
            <p className="text-sm text-muted-foreground">
              Configure os patamares min/max dos numeros de urgencia exibidos no catalogo
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Header Viewers */}
            <Card>
              <CardHeader>
                <CardTitle>Header — Viewers Globais</CardTitle>
                <CardDescription>
                  Numero de &quot;pessoas vendo agora&quot; no topo do catalogo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Minimo</Label>
                    <Input
                      type="number"
                      min="0"
                      value={catalogoConfigs.catalogo_urgencia_header_viewers_min}
                      onChange={(e) =>
                        setCatalogoConfigs((prev) => ({
                          ...prev,
                          catalogo_urgencia_header_viewers_min: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Maximo</Label>
                    <Input
                      type="number"
                      min="1"
                      value={catalogoConfigs.catalogo_urgencia_header_viewers_max}
                      onChange={(e) =>
                        setCatalogoConfigs((prev) => ({
                          ...prev,
                          catalogo_urgencia_header_viewers_max: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Viewers por Peça */}
            <Card>
              <CardHeader>
                <CardTitle>Viewers por Peca</CardTitle>
                <CardDescription>
                  &quot;Pessoas vendo agora&quot; em cada peca, por faixa de preco
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(["baixo", "medio", "alto"] as const).map((faixa) => (
                  <div key={faixa} className="grid grid-cols-[100px_1fr_1fr] gap-3 items-center">
                    <span className="text-sm text-muted-foreground">
                      {faixa === "baixo" ? "< R$5k" : faixa === "medio" ? "R$5k-15k" : "> R$15k"}
                    </span>
                    <Input
                      type="number"
                      min="0"
                      placeholder="Min"
                      value={catalogoConfigs[`catalogo_urgencia_viewers_min_${faixa}`]}
                      onChange={(e) =>
                        setCatalogoConfigs((prev) => ({
                          ...prev,
                          [`catalogo_urgencia_viewers_min_${faixa}`]: e.target.value,
                        }))
                      }
                    />
                    <Input
                      type="number"
                      min="1"
                      placeholder="Max"
                      value={catalogoConfigs[`catalogo_urgencia_viewers_max_${faixa}`]}
                      onChange={(e) =>
                        setCatalogoConfigs((prev) => ({
                          ...prev,
                          [`catalogo_urgencia_viewers_max_${faixa}`]: e.target.value,
                        }))
                      }
                    />
                  </div>
                ))}
                <div className="grid grid-cols-[100px_1fr_1fr] gap-3 text-xs text-muted-foreground">
                  <span />
                  <span className="text-center">Min</span>
                  <span className="text-center">Max</span>
                </div>
              </CardContent>
            </Card>

            {/* Vendidos 7 dias */}
            <Card>
              <CardHeader>
                <CardTitle>Vendidos (7 dias)</CardTitle>
                <CardDescription>
                  &quot;Similares vendidos nos ultimos 7 dias&quot; por faixa de preco
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(["baixo", "medio", "alto"] as const).map((faixa) => (
                  <div key={faixa} className="grid grid-cols-[100px_1fr_1fr] gap-3 items-center">
                    <span className="text-sm text-muted-foreground">
                      {faixa === "baixo" ? "< R$5k" : faixa === "medio" ? "R$5k-15k" : "> R$15k"}
                    </span>
                    <Input
                      type="number"
                      min="0"
                      placeholder="Min"
                      value={catalogoConfigs[`catalogo_urgencia_vendidos_min_${faixa}`]}
                      onChange={(e) =>
                        setCatalogoConfigs((prev) => ({
                          ...prev,
                          [`catalogo_urgencia_vendidos_min_${faixa}`]: e.target.value,
                        }))
                      }
                    />
                    <Input
                      type="number"
                      min="1"
                      placeholder="Max"
                      value={catalogoConfigs[`catalogo_urgencia_vendidos_max_${faixa}`]}
                      onChange={(e) =>
                        setCatalogoConfigs((prev) => ({
                          ...prev,
                          [`catalogo_urgencia_vendidos_max_${faixa}`]: e.target.value,
                        }))
                      }
                    />
                  </div>
                ))}
                <div className="grid grid-cols-[100px_1fr_1fr] gap-3 text-xs text-muted-foreground">
                  <span />
                  <span className="text-center">Min</span>
                  <span className="text-center">Max</span>
                </div>
              </CardContent>
            </Card>

            {/* Interações */}
            <Card>
              <CardHeader>
                <CardTitle>Interacoes</CardTitle>
                <CardDescription>
                  &quot;Pessoas que interagiram com essa peca&quot; por faixa de preco
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(["baixo", "medio", "alto"] as const).map((faixa) => (
                  <div key={faixa} className="grid grid-cols-[100px_1fr_1fr] gap-3 items-center">
                    <span className="text-sm text-muted-foreground">
                      {faixa === "baixo" ? "< R$5k" : faixa === "medio" ? "R$5k-15k" : "> R$15k"}
                    </span>
                    <Input
                      type="number"
                      min="0"
                      placeholder="Min"
                      value={catalogoConfigs[`catalogo_urgencia_interacoes_min_${faixa}`]}
                      onChange={(e) =>
                        setCatalogoConfigs((prev) => ({
                          ...prev,
                          [`catalogo_urgencia_interacoes_min_${faixa}`]: e.target.value,
                        }))
                      }
                    />
                    <Input
                      type="number"
                      min="1"
                      placeholder="Max"
                      value={catalogoConfigs[`catalogo_urgencia_interacoes_max_${faixa}`]}
                      onChange={(e) =>
                        setCatalogoConfigs((prev) => ({
                          ...prev,
                          [`catalogo_urgencia_interacoes_max_${faixa}`]: e.target.value,
                        }))
                      }
                    />
                  </div>
                ))}
                <div className="grid grid-cols-[100px_1fr_1fr] gap-3 text-xs text-muted-foreground">
                  <span />
                  <span className="text-center">Min</span>
                  <span className="text-center">Max</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Botoes */}
          <div className="flex justify-end gap-4 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin")}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={updateMutation.isPending || catalogoMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {updateMutation.isPending || catalogoMutation.isPending ? "Salvando..." : "Salvar Configuracoes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
