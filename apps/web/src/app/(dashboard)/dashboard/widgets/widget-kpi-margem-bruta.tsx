"use client";

import { Percent } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiMargemBrutaProps {
  margemBrutaMes: number;
}

export function WidgetKpiMargemBruta({
  margemBrutaMes,
}: KpiMargemBrutaProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Margem Bruta
        </CardTitle>
        <Percent className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {margemBrutaMes.toFixed(1)}%
        </div>
        <p className={cn(
          "text-xs",
          margemBrutaMes >= 30 ? "text-green-600" : margemBrutaMes >= 15 ? "text-yellow-600" : "text-red-600"
        )}>
          {margemBrutaMes >= 30 ? "Saudavel" : margemBrutaMes >= 15 ? "Atencao" : "Baixa"}
        </p>
      </CardContent>
    </Card>
  );
}
