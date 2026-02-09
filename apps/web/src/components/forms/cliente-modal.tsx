"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { EnderecoFields } from "./endereco-fields";
import { trpc } from "@/utils/trpc";
import { toast } from "sonner";
import { formatCPF, formatCNPJ } from "@/lib/formatters";

interface ClienteData {
  tipo: "PESSOA_FISICA" | "PESSOA_JURIDICA";
  nome: string;
  cpfCnpj: string;
  dataNascimento: string;
  telefone: string;
  email: string;
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
}

interface ClienteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (cliente: { id: string; nome: string }) => void;
}

const defaultData: ClienteData = {
  tipo: "PESSOA_FISICA",
  nome: "",
  cpfCnpj: "",
  dataNascimento: "",
  telefone: "",
  email: "",
  cep: "",
  rua: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
};

export function ClienteModal({ open, onOpenChange, onSuccess }: ClienteModalProps) {
  const [data, setData] = useState<ClienteData>(defaultData);
  const [errors, setErrors] = useState<Partial<Record<keyof ClienteData, string>>>({});

  const createMutation = useMutation(
    trpc.cliente.create.mutationOptions({
      onSuccess: (cliente) => {
        toast.success("Cliente criado com sucesso!");
        onSuccess({ id: cliente.id, nome: cliente.nome });
        // Limpar formulario
        setData(defaultData);
        setErrors({});
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const handleChange = (field: keyof ClienteData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const formatTelefone = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    if (cleaned.length <= 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
  };

  const formatCpfCnpj = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (data.tipo === "PESSOA_FISICA") {
      return formatCPF(cleaned);
    }
    return formatCNPJ(cleaned);
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ClienteData, string>> = {};

    if (!data.nome.trim()) {
      newErrors.nome = "Nome e obrigatorio";
    }

    const cpfCnpjLimpo = data.cpfCnpj.replace(/\D/g, "");
    if (data.tipo === "PESSOA_FISICA" && cpfCnpjLimpo.length !== 11) {
      newErrors.cpfCnpj = "CPF deve ter 11 digitos";
    }
    if (data.tipo === "PESSOA_JURIDICA" && cpfCnpjLimpo.length !== 14) {
      newErrors.cpfCnpj = "CNPJ deve ter 14 digitos";
    }

    if (data.tipo === "PESSOA_FISICA" && !data.dataNascimento) {
      newErrors.dataNascimento = "Data de nascimento e obrigatoria para PF";
    }

    const telefoneLimpo = data.telefone.replace(/\D/g, "");
    if (telefoneLimpo.length < 10 || telefoneLimpo.length > 11) {
      newErrors.telefone = "Telefone invalido";
    }

    if (!data.cep || data.cep.length !== 8) {
      newErrors.cep = "CEP deve ter 8 digitos";
    }

    if (!data.rua.trim()) {
      newErrors.rua = "Rua e obrigatoria";
    }

    if (!data.numero.trim()) {
      newErrors.numero = "Numero e obrigatorio";
    }

    if (!data.bairro.trim()) {
      newErrors.bairro = "Bairro e obrigatorio";
    }

    if (!data.cidade.trim()) {
      newErrors.cidade = "Cidade e obrigatoria";
    }

    if (!data.estado || data.estado.length !== 2) {
      newErrors.estado = "Estado deve ter 2 caracteres";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!validate()) {
      toast.error("Por favor, corrija os erros no formulario");
      return;
    }

    const payload = {
      ...data,
      cpfCnpj: data.cpfCnpj.replace(/\D/g, ""),
      telefone: data.telefone.replace(/\D/g, ""),
      dataNascimento: data.dataNascimento || undefined,
      email: data.email || undefined,
      complemento: data.complemento || undefined,
    };

    createMutation.mutate(payload);
  };

  const handleClose = () => {
    setData(defaultData);
    setErrors({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Cliente</DialogTitle>
          <DialogDescription>
            Preencha os dados do cliente. Apos criar, ele sera selecionado automaticamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Dados Basicos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo *</Label>
              <Select
                value={data.tipo}
                onValueChange={(value) => {
                  handleChange("tipo", value);
                  handleChange("cpfCnpj", "");
                  handleChange("dataNascimento", "");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PESSOA_FISICA">Pessoa Fisica</SelectItem>
                  <SelectItem value="PESSOA_JURIDICA">Pessoa Juridica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpfCnpj">
                {data.tipo === "PESSOA_FISICA" ? "CPF *" : "CNPJ *"}
              </Label>
              <Input
                id="cpfCnpj"
                value={formatCpfCnpj(data.cpfCnpj)}
                onChange={(e) => handleChange("cpfCnpj", e.target.value)}
                placeholder={data.tipo === "PESSOA_FISICA" ? "000.000.000-00" : "00.000.000/0000-00"}
                maxLength={data.tipo === "PESSOA_FISICA" ? 14 : 18}
              />
              {errors.cpfCnpj && (
                <p className="text-sm text-red-500">{errors.cpfCnpj}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input
              id="nome"
              value={data.nome}
              onChange={(e) => handleChange("nome", e.target.value)}
              placeholder="Nome completo ou razao social"
            />
            {errors.nome && (
              <p className="text-sm text-red-500">{errors.nome}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.tipo === "PESSOA_FISICA" && (
              <div className="space-y-2">
                <Label htmlFor="dataNascimento">Data de Nascimento *</Label>
                <Input
                  id="dataNascimento"
                  type="date"
                  value={data.dataNascimento}
                  onChange={(e) => handleChange("dataNascimento", e.target.value)}
                />
                {errors.dataNascimento && (
                  <p className="text-sm text-red-500">{errors.dataNascimento}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone *</Label>
              <Input
                id="telefone"
                value={formatTelefone(data.telefone)}
                onChange={(e) => handleChange("telefone", e.target.value)}
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
              {errors.telefone && (
                <p className="text-sm text-red-500">{errors.telefone}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={data.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>
          </div>

          {/* Endereco */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-4">Endereco</h4>
            <EnderecoFields
              data={{
                cep: data.cep,
                rua: data.rua,
                numero: data.numero,
                complemento: data.complemento,
                bairro: data.bairro,
                cidade: data.cidade,
                estado: data.estado,
              }}
              onChange={(endereco) => setData((prev) => ({ ...prev, ...endereco }))}
              errors={{
                cep: errors.cep,
                rua: errors.rua,
                numero: errors.numero,
                bairro: errors.bairro,
                cidade: errors.cidade,
                estado: errors.estado,
              }}
            />
          </div>

          {/* Botoes */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Cliente
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
