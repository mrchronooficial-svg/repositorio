"use client";

import { Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface KpiEmRevisaoProps {
  emRevisao: number;
}

export function WidgetKpiEmRevisao({ emRevisao }: KpiEmRevisaoProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Em Revisao
        </CardTitle>
        <Wrench className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{emRevisao}</div>
        <p className="text-xs text-muted-foreground">pecas no relojoeiro</p>
      </CardContent>
    </Card>
  );
}
