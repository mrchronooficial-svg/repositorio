"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/utils/trpc";
import { formatDateTime } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const ACAO_LABELS: Record<string, string> = {
  CRIAR: "Criar",
  EDITAR: "Editar",
  EXCLUIR: "Excluir",
  ARQUIVAR: "Arquivar",
  RESTAURAR: "Restaurar",
  DESATIVAR: "Desativar",
  REATIVAR: "Reativar",
  RESETAR_SENHA: "Resetar Senha",
  ALTERAR_STATUS: "Alterar Status",
  REGISTRAR_PAGAMENTO: "Registrar Pagamento",
  REGISTRAR_REPASSE: "Registrar Repasse",
  CANCELAR_VENDA: "Cancelar Venda",
};

const ACAO_COLORS: Record<string, string> = {
  CRIAR: "bg-green-100 text-green-800",
  EDITAR: "bg-blue-100 text-blue-800",
  EXCLUIR: "bg-red-100 text-red-800",
  ARQUIVAR: "bg-gray-100 text-gray-800",
  RESTAURAR: "bg-purple-100 text-purple-800",
  DESATIVAR: "bg-red-100 text-red-800",
  REATIVAR: "bg-green-100 text-green-800",
  RESETAR_SENHA: "bg-amber-100 text-amber-800",
  ALTERAR_STATUS: "bg-blue-100 text-blue-800",
  REGISTRAR_PAGAMENTO: "bg-green-100 text-green-800",
  REGISTRAR_REPASSE: "bg-purple-100 text-purple-800",
  CANCELAR_VENDA: "bg-red-100 text-red-800",
};

interface LogAtividadeProps {
  entidade: "PECA" | "VENDA" | "CLIENTE" | "FORNECEDOR";
  entidadeId: string;
}

export function LogAtividade({ entidade, entidadeId }: LogAtividadeProps) {
  const { data: logs, isError } = useQuery({
    ...trpc.auditoria.getByEntidade.queryOptions({ entidade, entidadeId }),
    enabled: !!entidadeId,
    retry: false,
  });

  // Se a query falhar (nao-admin), nao renderiza nada
  if (isError) return null;

  // Enquanto carrega, nao mostra nada para evitar flash
  if (!logs) return null;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Log de Atividades</CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma atividade registrada
          </p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-3 p-2 rounded border text-sm"
              >
                <span
                  className={cn(
                    "px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap",
                    ACAO_COLORS[log.acao] || "bg-gray-100 text-gray-800"
                  )}
                >
                  {ACAO_LABELS[log.acao] || log.acao}
                </span>
                <span className="text-muted-foreground truncate">
                  {log.user?.name || "Sistema"}
                </span>
                <span className="text-muted-foreground ml-auto whitespace-nowrap">
                  {formatDateTime(log.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
