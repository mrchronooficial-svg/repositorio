"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface ContaData {
  id: string;
  codigo: string;
  nome: string;
  tipo: "GRUPO" | "SUBGRUPO" | "ANALITICA";
  natureza: "DEVEDORA" | "CREDORA";
  contaPaiId: string | null;
  ordem: number;
}

interface ContaListItem {
  id: string;
  codigo: string;
  nome: string;
  tipo: "GRUPO" | "SUBGRUPO" | "ANALITICA";
}

interface ContaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingConta: ContaData | null;
  parentForNew: string | null;
  contas: ContaListItem[];
  onSubmit: (data: {
    codigo: string;
    nome: string;
    tipo: "GRUPO" | "SUBGRUPO" | "ANALITICA";
    natureza: "DEVEDORA" | "CREDORA";
    contaPaiId: string | null;
    ordem?: number;
  }) => void;
  isLoading: boolean;
}

export function ContaFormDialog({
  open,
  onOpenChange,
  editingConta,
  parentForNew,
  contas,
  onSubmit,
  isLoading,
}: ContaFormDialogProps) {
  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<"GRUPO" | "SUBGRUPO" | "ANALITICA">("ANALITICA");
  const [natureza, setNatureza] = useState<"DEVEDORA" | "CREDORA">("DEVEDORA");
  const [contaPaiId, setContaPaiId] = useState<string>("none");

  // Apenas contas que podem ser pai (GRUPO ou SUBGRUPO)
  const possibleParents = contas.filter(
    (c) => c.tipo !== "ANALITICA" && c.id !== editingConta?.id
  );

  useEffect(() => {
    if (editingConta) {
      setCodigo(editingConta.codigo);
      setNome(editingConta.nome);
      setTipo(editingConta.tipo);
      setNatureza(editingConta.natureza);
      setContaPaiId(editingConta.contaPaiId ?? "none");
    } else {
      setCodigo("");
      setNome("");
      setTipo("ANALITICA");
      setNatureza("DEVEDORA");
      setContaPaiId(parentForNew ?? "none");

      // Pre-fill natureza based on parent
      if (parentForNew) {
        const parent = contas.find((c) => c.id === parentForNew);
        if (parent) {
          // Try to infer natureza from parent code
          const parentCode = parent.codigo;
          if (parentCode.startsWith("1") || parentCode.startsWith("4")) {
            setNatureza("DEVEDORA");
          } else {
            setNatureza("CREDORA");
          }
        }
      }
    }
  }, [editingConta, parentForNew, contas, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      codigo,
      nome,
      tipo,
      natureza,
      contaPaiId: contaPaiId === "none" ? null : contaPaiId,
    });
  };

  const isEditing = !!editingConta;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Conta" : "Nova Conta Contabil"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="codigo">Codigo</Label>
              <Input
                id="codigo"
                placeholder="Ex: 1.1.1.01"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GRUPO">Grupo</SelectItem>
                  <SelectItem value="SUBGRUPO">Subgrupo</SelectItem>
                  <SelectItem value="ANALITICA">Analitica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              placeholder="Ex: Nubank (Pix)"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="natureza">Natureza</Label>
              <Select value={natureza} onValueChange={(v) => setNatureza(v as typeof natureza)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEVEDORA">Devedora</SelectItem>
                  <SelectItem value="CREDORA">Credora</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contaPai">Conta Pai</Label>
              <Select value={contaPaiId} onValueChange={setContaPaiId}>
                <SelectTrigger>
                  <SelectValue placeholder="Nenhuma (raiz)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma (raiz)</SelectItem>
                  {possibleParents.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.codigo} — {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !codigo || !nome}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
