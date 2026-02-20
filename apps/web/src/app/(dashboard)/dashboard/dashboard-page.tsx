"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GridLayout, getCompactor } from "react-grid-layout";
import type { LayoutItem } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { Settings2, RotateCcw, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { trpc } from "@/utils/trpc";
import { usePermissions } from "@/hooks/use-permissions";
import { useDashboardLayout } from "@/hooks/use-dashboard-layout";
import type { SectionId, GridItem } from "./widgets/types";
import { SECTION_LABELS } from "./widgets/types";
import { SectionWrapper } from "./widgets/section-wrapper";
import { WidgetAlertas } from "./widgets/widget-alertas";
import { WidgetUtensilios } from "./widgets/widget-utensilios";
import { WidgetKpiEstoque } from "./widgets/widget-kpi-estoque";
import { WidgetKpiVendas } from "./widgets/widget-kpi-vendas";
import { WidgetKpiFaturamento } from "./widgets/widget-kpi-faturamento";
import { WidgetKpiReceber } from "./widgets/widget-kpi-receber";
import { WidgetKpiPagar } from "./widgets/widget-kpi-pagar";
import { WidgetKpiClientes } from "./widgets/widget-kpi-clientes";
import { WidgetKpiEmRevisao } from "./widgets/widget-kpi-em-revisao";
import { WidgetKpiLucroBruto } from "./widgets/widget-kpi-lucro-bruto";
import { WidgetKpiMargemBruta } from "./widgets/widget-kpi-margem-bruta";
import { WidgetKpiEstoqueCusto } from "./widgets/widget-kpi-estoque-custo";
import { WidgetKpiEstoqueFaturamento } from "./widgets/widget-kpi-estoque-faturamento";
import { WidgetGraficos } from "./widgets/widget-graficos";
import { WidgetListas } from "./widgets/widget-listas";
import { WidgetPaceVendas } from "./widgets/widget-pace-vendas";
import { WidgetRecebiveis } from "./widgets/widget-recebiveis";
import { WidgetDividas } from "./widgets/widget-dividas";
import { ModalRecebiveis } from "./widgets/modal-recebiveis";
import { ModalDividas } from "./widgets/modal-dividas";

const GRID_COLS = 8;
const ROW_HEIGHT = 80;
const GRID_MARGIN: [number, number] = [16, 16];

// No compaction + prevent collision = free-form grid with no overlaps
const freeFormCompactor = getCompactor(null, false, true);

export function DashboardPage() {
  const queryClient = useQueryClient();
  const { podeVerValores, isAdmin } = usePermissions();
  const [showRecebiveisModal, setShowRecebiveisModal] = useState(false);
  const [showDividasModal, setShowDividasModal] = useState(false);

  const {
    layout,
    isEditMode,
    loaded,
    updateGrid,
    hideSection,
    showSection,
    resizeSection,
    resetLayout,
    toggleEditMode,
  } = useDashboardLayout();

  // ── Container width measurement ──
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1200);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => setContainerWidth(el.clientWidth);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ── Queries ──
  const { data: metricas, isLoading: isLoadingMetricas } = useQuery(
    trpc.dashboard.getMetricas.queryOptions()
  );
  const { data: evolucaoVendas, isLoading: isLoadingEvolucao } = useQuery(
    trpc.dashboard.getEvolucaoVendas.queryOptions()
  );
  const { data: vendasRecentes } = useQuery(
    trpc.dashboard.getVendasRecentes.queryOptions()
  );
  const { data: pecasEmRevisao } = useQuery(
    trpc.dashboard.getPecasEmRevisao.queryOptions()
  );
  const { data: recebiveis } = useQuery(
    trpc.dashboard.getRecebiveisPendentes.queryOptions()
  );
  const { data: dividasFornecedores } = useQuery(
    trpc.dashboard.getDividasFornecedores.queryOptions()
  );
  const { data: alertasEnvio } = useQuery(
    trpc.logistica.getAlertasEnvio.queryOptions()
  );
  const { data: utensilios } = useQuery(
    trpc.utensilio.list.queryOptions()
  );
  const { data: paceVendas, isLoading: isLoadingPace } = useQuery(
    trpc.dashboard.getPaceVendas.queryOptions()
  );
  const { data: valorEstoque } = useQuery(
    trpc.dashboard.getMetricasValorEstoque.queryOptions()
  );

  const verificarAlertasMutation = useMutation(
    trpc.alerta.verificarAlertas.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["alerta"] });
      },
    })
  );

  useEffect(() => {
    verificarAlertasMutation.mutate();
  }, []);

  // ── Visibility ──
  const sectionVisibility: Record<SectionId, boolean> = {
    utensilios: !!utensilios && utensilios.length > 0,
    kpiEstoque: true,
    kpiVendas: true,
    kpiFaturamento: podeVerValores,
    kpiLucroBruto: isAdmin,
    kpiMargemBruta: isAdmin,
    kpiReceber: podeVerValores,
    kpiPagar: podeVerValores && !!dividasFornecedores,
    kpiEstoqueCusto: podeVerValores && !!valorEstoque,
    kpiEstoqueFaturamento: podeVerValores && !!valorEstoque,
    kpiClientes: !podeVerValores,
    kpiEmRevisao: !podeVerValores,
    paceVendas: true,
    graficos: true,
    listas: true,
    recebiveis: podeVerValores && !!recebiveis && recebiveis.length > 0,
    dividas:
      podeVerValores &&
      !!dividasFornecedores &&
      dividasFornecedores.totalGeral > 0,
  };

  const hiddenSet = new Set(layout.hiddenSections);

  const visibleGrid = layout.grid.filter(
    (item) => sectionVisibility[item.i] && !hiddenSet.has(item.i)
  );

  const restorableSections = layout.hiddenSections.filter(
    (id) => sectionVisibility[id]
  );

  // ── Layout change handler ──
  const handleLayoutChange = useCallback(
    (newLayout: readonly LayoutItem[]) => {
      const mapped: GridItem[] = newLayout
        .filter((item) => layout.grid.some((g) => g.i === item.i))
        .map((item) => ({
          i: item.i as SectionId,
          x: item.x,
          y: item.y,
          w: item.w,
          h: item.h,
        }));

      // Merge back hidden items that aren't in the visible layout
      const visibleIds = new Set(mapped.map((m) => m.i));
      const hiddenItems = layout.grid.filter(
        (item) => !visibleIds.has(item.i)
      );

      updateGrid([...mapped, ...hiddenItems]);
    },
    [layout.grid, updateGrid]
  );

  // ── Section renderers ──
  function renderSection(id: SectionId) {
    switch (id) {
      case "utensilios":
        return utensilios && utensilios.length > 0 ? (
          <WidgetUtensilios data={utensilios as any} />
        ) : null;

      case "kpiEstoque":
        return metricas ? (
          <WidgetKpiEstoque
            emEstoque={metricas.estoque.emEstoque}
            disponivel={metricas.estoque.disponivel}
            emTransito={metricas.estoque.emTransito}
            emRevisao={metricas.estoque.emRevisao}
            isEditMode={isEditMode}
          />
        ) : null;

      case "kpiVendas":
        return metricas ? (
          <WidgetKpiVendas
            vendasMes={metricas.vendas.mes}
            variacao={metricas.vendas.variacao ?? 0}
            isEditMode={isEditMode}
          />
        ) : null;

      case "kpiFaturamento":
        return metricas?.financeiro ? (
          <WidgetKpiFaturamento
            faturamentoMes={metricas.financeiro.faturamentoMes}
            variacaoFaturamento={metricas.financeiro.variacaoFaturamento ?? 0}
          />
        ) : null;

      case "kpiLucroBruto":
        return metricas?.financeiro && metricas.financeiro.lucroBrutoMes != null ? (
          <WidgetKpiLucroBruto
            lucroBrutoMes={metricas.financeiro.lucroBrutoMes}
            lucroBrutoPorPeca={metricas.financeiro.lucroBrutoPorPeca ?? 0}
          />
        ) : null;

      case "kpiMargemBruta":
        return metricas?.financeiro && metricas.financeiro.margemBrutaMes != null ? (
          <WidgetKpiMargemBruta
            margemBrutaMes={metricas.financeiro.margemBrutaMes}
          />
        ) : null;

      case "kpiReceber":
        return metricas?.financeiro ? (
          <WidgetKpiReceber
            recebiveis={metricas.financeiro.recebiveis}
            repassesPendentes={metricas.financeiro.repassesPendentes}
            isEditMode={isEditMode}
            onShowModal={() => setShowRecebiveisModal(true)}
          />
        ) : null;

      case "kpiPagar":
        return dividasFornecedores ? (
          <WidgetKpiPagar
            totalGeral={dividasFornecedores.totalGeral}
            repassesTotal={dividasFornecedores.repasses.total}
            repassesQtd={dividasFornecedores.repasses.quantidade}
            pagamentosTotal={dividasFornecedores.pagamentos.total}
            pagamentosQtd={dividasFornecedores.pagamentos.quantidade}
            isEditMode={isEditMode}
            onShowModal={() => setShowDividasModal(true)}
          />
        ) : null;

      case "kpiEstoqueCusto":
        return valorEstoque ? (
          <WidgetKpiEstoqueCusto
            valorCusto={valorEstoque.valorCusto}
            totalPecas={valorEstoque.totalPecas}
          />
        ) : null;

      case "kpiEstoqueFaturamento":
        return valorEstoque ? (
          <WidgetKpiEstoqueFaturamento
            valorFaturamento={valorEstoque.valorFaturamento}
            valorCusto={valorEstoque.valorCusto}
            totalPecas={valorEstoque.totalPecas}
          />
        ) : null;

      case "kpiClientes":
        return metricas ? (
          <WidgetKpiClientes
            totalVendas={metricas.vendas.total}
            isEditMode={isEditMode}
          />
        ) : null;

      case "kpiEmRevisao":
        return metricas ? (
          <WidgetKpiEmRevisao emRevisao={metricas.estoque.emRevisao} />
        ) : null;

      case "graficos":
        return metricas ? (
          <WidgetGraficos
            evolucaoVendas={evolucaoVendas as any}
            isLoadingEvolucao={isLoadingEvolucao}
            podeVerValores={podeVerValores}
            metricas={metricas as any}
          />
        ) : null;

      case "paceVendas":
        return (
          <WidgetPaceVendas
            data={paceVendas as any}
            isLoading={isLoadingPace}
          />
        );

      case "listas":
        return (
          <WidgetListas
            vendasRecentes={vendasRecentes as any}
            pecasEmRevisao={pecasEmRevisao as any}
            podeVerValores={podeVerValores}
            isEditMode={isEditMode}
          />
        );

      case "recebiveis":
        return recebiveis && recebiveis.length > 0 ? (
          <WidgetRecebiveis data={recebiveis as any} isEditMode={isEditMode} />
        ) : null;

      case "dividas":
        return dividasFornecedores && dividasFornecedores.totalGeral > 0 ? (
          <WidgetDividas
            repasses={dividasFornecedores.repasses as any}
            pagamentos={dividasFornecedores.pagamentos as any}
            isEditMode={isEditMode}
          />
        ) : null;
    }
  }

  // ── Loading state ──
  if (isLoadingMetricas || !loaded) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Visao geral do seu negocio</p>
        </div>
        <div className="flex items-center gap-2">
          {isEditMode && (
            <Button variant="ghost" size="sm" onClick={resetLayout}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Restaurar padrao
            </Button>
          )}
          <Button
            variant={isEditMode ? "default" : "outline"}
            size="sm"
            onClick={toggleEditMode}
          >
            <Settings2 className="h-4 w-4 mr-1" />
            {isEditMode ? "Concluir" : "Personalizar"}
          </Button>
        </div>
      </div>

      {isEditMode && (
        <p className="text-sm text-muted-foreground text-center">
          Arraste para reorganizar. Use{" "}
          <span className="font-medium">
            &minus;/+ ↔
          </span>{" "}
          para largura,{" "}
          <span className="font-medium">
            &minus;/+ ↕
          </span>{" "}
          para altura e{" "}
          <span className="font-medium">&times;</span> para ocultar.
        </p>
      )}

      {/* Restore hidden sections */}
      {isEditMode && restorableSections.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30">
          <span className="text-sm text-muted-foreground mr-1">
            Secoes ocultas:
          </span>
          {restorableSections.map((id) => (
            <Button
              key={id}
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => showSection(id)}
            >
              <Eye className="h-3 w-3 mr-1" />
              {SECTION_LABELS[id]}
            </Button>
          ))}
        </div>
      )}

      {/* Alertas (fixos, nao arrastaveis) */}
      <WidgetAlertas
        estoqueBaixo={
          metricas?.estoque.abaixoIdeal
            ? {
                abaixoIdeal: true,
                emEstoque: metricas.estoque.emEstoque,
                estoqueIdeal: metricas.estoque.estoqueIdeal,
              }
            : undefined
        }
        alertasEnvio={alertasEnvio as any}
      />

      {/* Grid layout */}
      <div ref={containerRef}>
        <GridLayout
          layout={visibleGrid}
          onLayoutChange={handleLayoutChange}
          width={containerWidth}
          compactor={freeFormCompactor}
          gridConfig={{
            cols: GRID_COLS,
            rowHeight: ROW_HEIGHT,
            margin: GRID_MARGIN,
          }}
          dragConfig={{
            enabled: isEditMode,
            handle: ".drag-handle",
          }}
          resizeConfig={{
            enabled: isEditMode,
          }}
        >
          {visibleGrid.map((item) => (
            <div key={item.i}>
              <SectionWrapper
                id={item.i}
                isEditMode={isEditMode}
                w={item.w}
                h={item.h}
                onHide={() => hideSection(item.i)}
                onResize={(newW, newH) => resizeSection(item.i, newW, newH)}
              >
                {renderSection(item.i)}
              </SectionWrapper>
            </div>
          ))}
        </GridLayout>
      </div>

      {/* Modals */}
      <ModalRecebiveis
        open={showRecebiveisModal}
        onOpenChange={setShowRecebiveisModal}
        data={recebiveis as any}
      />
      <ModalDividas
        open={showDividasModal}
        onOpenChange={setShowDividasModal}
        data={dividasFornecedores as any}
      />
    </div>
  );
}
