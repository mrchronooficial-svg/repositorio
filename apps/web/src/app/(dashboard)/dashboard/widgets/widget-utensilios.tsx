"use client";

import { useRouter } from "next/navigation";
import { Box } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Utensilio {
  id: string;
  nome: string;
  quantidade: number;
  quantidadeMinima: number;
}

interface UtensiliosProps {
  data: Utensilio[];
}

export function WidgetUtensilios({ data }: UtensiliosProps) {
  const router = useRouter();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Box className="h-5 w-5" />
          Utensilios de Embalagem
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {data.map((utensilio) => {
            const estoqueBaixo =
              utensilio.quantidade <= utensilio.quantidadeMinima;
            return (
              <div
                key={utensilio.id}
                className={cn(
                  "text-center p-3 rounded-lg border",
                  estoqueBaixo ? "border-red-200 bg-red-50" : "border-gray-200"
                )}
              >
                <p
                  className="text-sm text-muted-foreground truncate"
                  title={utensilio.nome}
                >
                  {utensilio.nome}
                </p>
                <p
                  className={cn(
                    "text-2xl font-bold",
                    estoqueBaixo ? "text-red-600" : ""
                  )}
                >
                  {utensilio.quantidade}
                </p>
                {estoqueBaixo && (
                  <p className="text-xs text-red-500">Estoque baixo!</p>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-4 text-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/admin?tab=utensilios")}
          >
            Gerenciar Utensilios
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
