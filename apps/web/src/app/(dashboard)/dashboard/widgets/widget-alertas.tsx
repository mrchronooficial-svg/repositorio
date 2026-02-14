"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle, PackageX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AlertasProps {
  estoqueBaixo?: {
    abaixoIdeal: boolean;
    emEstoque: number;
    estoqueIdeal: number;
  };
  alertasEnvio?: {
    vendasAtrasadas: unknown[];
    diasAlerta: number;
  };
}

export function WidgetAlertas({ estoqueBaixo, alertasEnvio }: AlertasProps) {
  const router = useRouter();

  const hasEstoqueBaixo = estoqueBaixo?.abaixoIdeal;
  const hasEnvioPendente =
    alertasEnvio && alertasEnvio.vendasAtrasadas.length > 0;

  if (!hasEstoqueBaixo && !hasEnvioPendente) return null;

  return (
    <>
      {hasEstoqueBaixo && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-amber-800">
                Estoque Abaixo do Ideal
              </p>
              <p className="text-sm text-amber-700">
                Voce tem {estoqueBaixo!.emEstoque} pecas em estoque. O ideal e
                ter pelo menos {estoqueBaixo!.estoqueIdeal} pecas.
              </p>
            </div>
            <Button
              variant="outline"
              className="border-amber-300 text-amber-800 hover:bg-amber-100"
              onClick={() => router.push("/estoque/novo")}
            >
              Cadastrar Peca
            </Button>
          </CardContent>
        </Card>
      )}

      {hasEnvioPendente && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
              <PackageX className="h-5 w-5 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-red-800">Envios Pendentes</p>
              <p className="text-sm text-red-700">
                {alertasEnvio!.vendasAtrasadas.length}{" "}
                {alertasEnvio!.vendasAtrasadas.length === 1
                  ? "peca vendida ha"
                  : "pecas vendidas ha"}{" "}
                mais de {alertasEnvio!.diasAlerta} dias sem envio.
              </p>
            </div>
            <Button
              variant="outline"
              className="border-red-300 text-red-800 hover:bg-red-100"
              onClick={() => router.push("/logistica")}
            >
              Ver Logistica
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
}
