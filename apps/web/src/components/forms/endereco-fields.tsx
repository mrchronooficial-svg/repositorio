"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EnderecoData {
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
}

interface EnderecoFieldsProps {
  data: EnderecoData;
  onChange: (data: EnderecoData) => void;
  errors?: Partial<Record<keyof EnderecoData, string>>;
}

interface ViaCEPResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export function EnderecoFields({ data, onChange, errors }: EnderecoFieldsProps) {
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [cepErro, setCepErro] = useState<string | null>(null);

  const handleCepChange = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, "");
    onChange({ ...data, cep: cepLimpo });
    setCepErro(null);

    if (cepLimpo.length === 8) {
      setBuscandoCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        const result: ViaCEPResponse = await response.json();

        if (result.erro) {
          setCepErro("CEP nao encontrado");
        } else {
          onChange({
            ...data,
            cep: cepLimpo,
            rua: result.logradouro || "",
            bairro: result.bairro || "",
            cidade: result.localidade || "",
            estado: result.uf || "",
          });
        }
      } catch {
        setCepErro("Erro ao buscar CEP");
      } finally {
        setBuscandoCep(false);
      }
    }
  };

  const handleChange = (field: keyof EnderecoData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  const formatCEP = (value: string) => {
    const cepLimpo = value.replace(/\D/g, "");
    if (cepLimpo.length <= 5) return cepLimpo;
    return `${cepLimpo.slice(0, 5)}-${cepLimpo.slice(5, 8)}`;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cep">CEP *</Label>
          <div className="relative">
            <Input
              id="cep"
              value={formatCEP(data.cep)}
              onChange={(e) => handleCepChange(e.target.value)}
              placeholder="00000-000"
              maxLength={9}
            />
            {buscandoCep && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          {(cepErro || errors?.cep) && (
            <p className="text-sm text-red-500">{cepErro || errors?.cep}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2 md:col-span-3">
          <Label htmlFor="rua">Rua *</Label>
          <Input
            id="rua"
            value={data.rua}
            onChange={(e) => handleChange("rua", e.target.value)}
            placeholder="Nome da rua"
          />
          {errors?.rua && (
            <p className="text-sm text-red-500">{errors.rua}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="numero">Numero *</Label>
          <Input
            id="numero"
            value={data.numero}
            onChange={(e) => handleChange("numero", e.target.value)}
            placeholder="123"
          />
          {errors?.numero && (
            <p className="text-sm text-red-500">{errors.numero}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="complemento">Complemento</Label>
          <Input
            id="complemento"
            value={data.complemento}
            onChange={(e) => handleChange("complemento", e.target.value)}
            placeholder="Apto, sala, etc."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bairro">Bairro *</Label>
          <Input
            id="bairro"
            value={data.bairro}
            onChange={(e) => handleChange("bairro", e.target.value)}
            placeholder="Nome do bairro"
          />
          {errors?.bairro && (
            <p className="text-sm text-red-500">{errors.bairro}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="cidade">Cidade *</Label>
          <Input
            id="cidade"
            value={data.cidade}
            onChange={(e) => handleChange("cidade", e.target.value)}
            placeholder="Nome da cidade"
          />
          {errors?.cidade && (
            <p className="text-sm text-red-500">{errors.cidade}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="estado">Estado *</Label>
          <Input
            id="estado"
            value={data.estado}
            onChange={(e) => handleChange("estado", e.target.value.toUpperCase())}
            placeholder="UF"
            maxLength={2}
          />
          {errors?.estado && (
            <p className="text-sm text-red-500">{errors.estado}</p>
          )}
        </div>
      </div>
    </div>
  );
}
