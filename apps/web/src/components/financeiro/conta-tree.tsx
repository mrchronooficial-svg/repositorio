"use client";

import { useState, useMemo } from "react";
import {
  ChevronRight,
  ChevronDown,
  Pencil,
  Trash2,
  Plus,
  FolderOpen,
  Folder,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  TIPO_CONTA_LABELS,
  NATUREZA_CONTA_LABELS,
} from "@/lib/constants";

interface ContaData {
  id: string;
  codigo: string;
  nome: string;
  tipo: "GRUPO" | "SUBGRUPO" | "ANALITICA";
  natureza: "DEVEDORA" | "CREDORA";
  contaPaiId: string | null;
  ordem: number;
  ativa: boolean;
  sistematica: boolean;
  _count: {
    linhasDebito: number;
    linhasCredito: number;
    contasFilhas: number;
  };
}

interface ContaTreeProps {
  contas: ContaData[];
  onEdit: (conta: {
    id: string;
    codigo: string;
    nome: string;
    tipo: "GRUPO" | "SUBGRUPO" | "ANALITICA";
    natureza: "DEVEDORA" | "CREDORA";
    contaPaiId: string | null;
    ordem: number;
  }) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string) => void;
}

interface TreeNode extends ContaData {
  children: TreeNode[];
}

function buildTree(contas: ContaData[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  // Create nodes
  for (const conta of contas) {
    map.set(conta.id, { ...conta, children: [] });
  }

  // Build tree
  for (const conta of contas) {
    const node = map.get(conta.id)!;
    if (conta.contaPaiId && map.has(conta.contaPaiId)) {
      map.get(conta.contaPaiId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Sort children by codigo
  const sortChildren = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.codigo.localeCompare(b.codigo));
    for (const node of nodes) {
      sortChildren(node.children);
    }
  };
  sortChildren(roots);

  return roots;
}

function TreeItem({
  node,
  level,
  onEdit,
  onDelete,
  onAddChild,
}: {
  node: TreeNode;
  level: number;
  onEdit: ContaTreeProps["onEdit"];
  onDelete: ContaTreeProps["onDelete"];
  onAddChild: ContaTreeProps["onAddChild"];
}) {
  const [expanded, setExpanded] = useState(level < 2);
  const hasChildren = node.children.length > 0;
  const hasLancamentos = node._count.linhasDebito > 0 || node._count.linhasCredito > 0;
  const canDelete = !node.sistematica && !hasLancamentos && node.children.length === 0;

  const typeColor =
    node.tipo === "GRUPO"
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : node.tipo === "SUBGRUPO"
        ? "bg-purple-50 text-purple-700 border-purple-200"
        : "bg-emerald-50 text-emerald-700 border-emerald-200";

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors",
          !node.ativa && "opacity-50"
        )}
        style={{ paddingLeft: `${level * 24 + 8}px` }}
      >
        {/* Expand/collapse */}
        <button
          onClick={() => hasChildren && setExpanded(!expanded)}
          className={cn(
            "w-5 h-5 flex items-center justify-center rounded",
            hasChildren
              ? "hover:bg-muted cursor-pointer"
              : "cursor-default"
          )}
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )
          ) : (
            <span className="w-4" />
          )}
        </button>

        {/* Icon */}
        {node.tipo === "ANALITICA" ? (
          <FileText className="h-4 w-4 text-emerald-500 shrink-0" />
        ) : expanded && hasChildren ? (
          <FolderOpen className="h-4 w-4 text-amber-500 shrink-0" />
        ) : (
          <Folder className="h-4 w-4 text-amber-500 shrink-0" />
        )}

        {/* Codigo */}
        <span className="font-mono text-sm text-muted-foreground shrink-0">
          {node.codigo}
        </span>

        {/* Nome */}
        <span className={cn(
          "text-sm",
          node.tipo === "GRUPO" ? "font-semibold" : node.tipo === "SUBGRUPO" ? "font-medium" : ""
        )}>
          {node.nome}
        </span>

        {/* Tipo badge */}
        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", typeColor)}>
          {TIPO_CONTA_LABELS[node.tipo]}
        </Badge>

        {/* Natureza */}
        <span className="text-[10px] text-muted-foreground">
          {NATUREZA_CONTA_LABELS[node.natureza]}
        </span>

        {/* Lancamentos count */}
        {hasLancamentos && (
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {node._count.linhasDebito + node._count.linhasCredito} lanc.
          </span>
        )}

        {/* Actions (visible on hover) */}
        <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {node.tipo !== "ANALITICA" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onAddChild(node.id);
              }}
              title="Adicionar subconta"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onEdit({
                id: node.id,
                codigo: node.codigo,
                nome: node.nome,
                tipo: node.tipo,
                natureza: node.natureza,
                contaPaiId: node.contaPaiId,
                ordem: node.ordem,
              });
            }}
            title="Editar conta"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Excluir conta ${node.codigo} - ${node.nome}?`)) {
                  onDelete(node.id);
                }
              }}
              title="Excluir conta"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Children */}
      {expanded &&
        node.children.map((child) => (
          <TreeItem
            key={child.id}
            node={child}
            level={level + 1}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddChild={onAddChild}
          />
        ))}
    </div>
  );
}

export function ContaTree({ contas, onEdit, onDelete, onAddChild }: ContaTreeProps) {
  const tree = useMemo(() => buildTree(contas), [contas]);

  return (
    <div className="space-y-0.5">
      {tree.map((node) => (
        <TreeItem
          key={node.id}
          node={node}
          level={0}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddChild={onAddChild}
        />
      ))}
    </div>
  );
}
