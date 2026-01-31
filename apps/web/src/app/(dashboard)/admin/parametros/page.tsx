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

  const queryOptions = trpc.configuracao.getAll.queryOptions();
  const { data: configs, isLoading } = useQuery(queryOptions);

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

  const updateMutationOptions = trpc.configuracao.updateMany.mutationOptions();
  const updateMutation = useMutation({
    mutationFn: updateMutationOptions.mutationFn,
    onSuccess: () => {
      toast.success("Configuracoes salvas com sucesso!");
      queryClient.invalidateQueries({ queryKey: queryOptions.queryKey });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetMutationOptions = trpc.configuracao.resetToDefaults.mutationOptions();
  const resetMutation = useMutation({
    mutationFn: resetMutationOptions.mutationFn,
    onSuccess: () => {
      toast.success("Configuracoes restauradas para os valores padrao!");
      queryClient.invalidateQueries({ queryKey: queryOptions.queryKey });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

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

    updateMutation.mutate({
      configuracoes: [
        { chave: "TAXA_MDR", valor: taxaMDR },
        { chave: "LEAD_TIME_DIAS", valor: leadTime },
        { chave: "META_VENDAS_SEMANAL", valor: metaSemanal },
        { chave: "ALERTA_DIAS_RELOJOEIRO", valor: diasRelojoeiro },
        { chave: "dias_alerta_envio", valor: diasAlertaEnvio },
      ],
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

          {/* Botoes */}
          <div className="flex justify-end gap-4 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin")}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {updateMutation.isPending ? "Salvando..." : "Salvar Configuracoes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
