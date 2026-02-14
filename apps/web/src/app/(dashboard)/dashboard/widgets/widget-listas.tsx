"use client";

import { useRouter } from "next/navigation";
import type { Route } from "next";
import { ArrowRight, Clock, Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface VendaRecente {
  id: string;
  valorFinal: number | string | null;
  statusPagamento: string;
  peca: { sku: string };
  cliente: { nome: string };
}

interface PecaEmRevisao {
  id: string;
  sku: string;
  marca: string;
  modelo: string;
  diasEmRevisao: number;
  localizacao: string;
  atrasado: boolean;
}

interface ListasProps {
  vendasRecentes?: VendaRecente[];
  pecasEmRevisao?: PecaEmRevisao[];
  podeVerValores: boolean;
  isEditMode: boolean;
}

export function WidgetListas({
  vendasRecentes,
  pecasEmRevisao,
  podeVerValores,
  isEditMode,
}: ListasProps) {
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Vendas recentes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Vendas Recentes</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => !isEditMode && router.push("/vendas")}
          >
            Ver todas
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {!vendasRecentes || vendasRecentes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma venda registrada
            </p>
          ) : (
            <div className="space-y-3">
              {vendasRecentes.map((venda) => (
                <div
                  key={venda.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                  onClick={() =>
                    !isEditMode &&
                    router.push(`/vendas/${venda.id}` as Route)
                  }
                >
                  <div>
                    <p className="font-mono text-sm">{venda.peca.sku}</p>
                    <p className="text-xs text-muted-foreground">
                      {venda.cliente.nome}
                    </p>
                  </div>
                  <div className="text-right">
                    {podeVerValores && venda.valorFinal && (
                      <p className="font-medium">
                        {formatCurrency(Number(venda.valorFinal))}
                      </p>
                    )}
                    <StatusBadge
                      type="pagamento"
                      status={venda.statusPagamento}
                      size="sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pecas em revisao */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Pecas em Revisao</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              !isEditMode && router.push("/estoque?status=REVISAO")
            }
          >
            Ver todas
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {!pecasEmRevisao || pecasEmRevisao.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma peca em revisao
            </p>
          ) : (
            <div className="space-y-3">
              {pecasEmRevisao.map((peca) => (
                <div
                  key={peca.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border cursor-pointer",
                    peca.atrasado
                      ? "border-orange-200 bg-orange-50 hover:bg-orange-100"
                      : "hover:bg-muted/50"
                  )}
                  onClick={() =>
                    !isEditMode &&
                    router.push(`/estoque/${peca.id}` as Route)
                  }
                >
                  <div>
                    <p className="font-mono text-sm">{peca.sku}</p>
                    <p className="text-xs text-muted-foreground">
                      {peca.marca} {peca.modelo}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={cn(
                        "text-sm font-medium flex items-center gap-1",
                        peca.atrasado ? "text-orange-600" : ""
                      )}
                    >
                      {peca.atrasado && <Clock className="h-3 w-3" />}
                      {peca.diasEmRevisao} dias
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {peca.localizacao}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
