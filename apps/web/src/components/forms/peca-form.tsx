"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FotoUpload } from "./foto-upload";
import { FornecedorModal } from "./fornecedor-modal";
import { trpc } from "@/utils/trpc";
import { toast } from "sonner";

interface PecaData {
  marca: string;
  modelo: string;
  ano: string;
  tamanhoCaixa: string;
  materialCaixa: string;
  materialPulseira: string;
  valorCompra: string;
  valorEstimadoVenda: string;
  origemTipo: "COMPRA" | "CONSIGNACAO";
  origemCanal: "PESSOA_FISICA" | "LEILAO_BRASIL" | "EBAY" | "";
  valorRepasse: string;
  localizacao: string;
  fornecedorId: string;
  fotos: string[];
}

interface PecaFormProps {
  initialData?: Partial<PecaData> & { id?: string };
  isEditing?: boolean;
}

const defaultData: PecaData = {
  marca: "",
  modelo: "",
  ano: "",
  tamanhoCaixa: "",
  materialCaixa: "",
  materialPulseira: "",
  valorCompra: "",
  valorEstimadoVenda: "",
  origemTipo: "COMPRA",
  origemCanal: "",
  valorRepasse: "",
  localizacao: "Fornecedor",
  fornecedorId: "",
  fotos: [],
};

// Opcoes de materiais
const materiaisCaixa = [
  "Aco Inoxidavel",
  "Ouro Amarelo",
  "Ouro Rosa",
  "Ouro Branco",
  "Platina",
  "Titanio",
  "Bronze",
  "Prata",
  "Ceramica",
  "Carbono",
  "Plastico/Resina",
  "Aco com Ouro",
  "Outro",
];

const materiaisPulseira = [
  "Aco Inoxidavel",
  "Couro",
  "Borracha/Silicone",
  "Nylon/NATO",
  "Ouro Amarelo",
  "Ouro Rosa",
  "Ouro Branco",
  "Titanio",
  "Tecido",
  "Ceramica",
  "Aco com Ouro",
  "Jubilee",
  "Oyster",
  "President",
  "Milanese",
  "Outro",
];

export function PecaForm({ initialData, isEditing }: PecaFormProps) {
  const router = useRouter();
  const [data, setData] = useState<PecaData>({
    ...defaultData,
    ...initialData,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof PecaData, string>>>({});
  const [fornecedorSearch, setFornecedorSearch] = useState("");
  const [showFornecedorList, setShowFornecedorList] = useState(false);
  const [showFornecedorModal, setShowFornecedorModal] = useState(false);

  const { data: localizacoes } = useQuery(trpc.peca.getLocalizacoes.queryOptions());

  const { data: fornecedores } = useQuery({
    ...trpc.fornecedor.list.queryOptions({
      page: 1,
      limit: 10,
      search: fornecedorSearch || undefined,
    }),
    enabled: fornecedorSearch.length > 1,
  });

  const { data: fornecedorSelecionado } = useQuery({
    ...trpc.fornecedor.getById.queryOptions({ id: data.fornecedorId }),
    enabled: !!data.fornecedorId,
  });

  const createMutation = useMutation({
    ...trpc.peca.create.mutationOptions(),
    onSuccess: (peca) => {
      toast.success(`Peca ${peca.sku} criada com sucesso!`);
      router.push("/estoque");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    ...trpc.peca.update.mutationOptions(),
    onSuccess: () => {
      toast.success("Peca atualizada com sucesso!");
      router.push(`/estoque/${initialData?.id}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateFotosMutation = useMutation({
    ...trpc.peca.updateFotos.mutationOptions(),
    onSuccess: () => {
      toast.success("Fotos atualizadas!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const handleChange = (field: keyof PecaData, value: string | string[]) => {
    setData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof PecaData, string>> = {};

    if (!data.marca.trim()) newErrors.marca = "Marca e obrigatoria";
    if (!data.modelo.trim()) newErrors.modelo = "Modelo e obrigatorio";
    if (!data.tamanhoCaixa || isNaN(parseFloat(data.tamanhoCaixa))) {
      newErrors.tamanhoCaixa = "Tamanho da caixa e obrigatorio";
    }

    // Valor de compra so e obrigatorio se for COMPRA (nao consignacao)
    if (data.origemTipo === "COMPRA") {
      if (!data.valorCompra || isNaN(parseFloat(data.valorCompra))) {
        newErrors.valorCompra = "Valor de compra e obrigatorio";
      }
    }

    if (!data.valorEstimadoVenda || isNaN(parseFloat(data.valorEstimadoVenda))) {
      newErrors.valorEstimadoVenda = "Valor estimado e obrigatorio";
    }
    if (!data.fornecedorId) newErrors.fornecedorId = "Fornecedor e obrigatorio";
    if (data.fotos.length === 0) newErrors.fotos = "Minimo 1 foto obrigatoria";

    // Valor de repasse so e obrigatorio se for CONSIGNACAO
    if (data.origemTipo === "CONSIGNACAO") {
      if (!data.valorRepasse || isNaN(parseFloat(data.valorRepasse))) {
        newErrors.valorRepasse = "Valor de repasse e obrigatorio para consignacao";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast.error("Por favor, corrija os erros no formulario");
      return;
    }

    const payload = {
      marca: data.marca,
      modelo: data.modelo,
      ano: data.ano ? parseInt(data.ano, 10) : undefined,
      tamanhoCaixa: parseFloat(data.tamanhoCaixa),
      materialCaixa: data.materialCaixa || undefined,
      materialPulseira: data.materialPulseira || undefined,
      // Consignacao nao tem valor de compra, usa 0
      valorCompra: data.origemTipo === "CONSIGNACAO" ? 0 : parseFloat(data.valorCompra),
      valorEstimadoVenda: parseFloat(data.valorEstimadoVenda),
      origemTipo: data.origemTipo,
      origemCanal: data.origemCanal || undefined,
      valorRepasse: data.valorRepasse ? parseFloat(data.valorRepasse) : undefined,
      localizacao: data.localizacao,
      fornecedorId: data.fornecedorId,
      fotos: data.fotos,
    };

    if (isEditing && initialData?.id) {
      updateMutation.mutate({
        id: initialData.id,
        marca: payload.marca,
        modelo: payload.modelo,
        ano: payload.ano,
        tamanhoCaixa: payload.tamanhoCaixa,
        materialCaixa: payload.materialCaixa,
        materialPulseira: payload.materialPulseira,
        valorCompra: payload.valorCompra,
        valorEstimadoVenda: payload.valorEstimadoVenda,
        valorRepasse: payload.valorRepasse,
        localizacao: payload.localizacao,
      });
      // Atualizar fotos separadamente
      if (JSON.stringify(data.fotos) !== JSON.stringify(initialData.fotos)) {
        updateFotosMutation.mutate({
          pecaId: initialData.id,
          fotos: data.fotos,
        });
      }
    } else {
      createMutation.mutate(payload);
    }
  };

  const selectFornecedor = (id: string) => {
    handleChange("fornecedorId", id);
    setShowFornecedorList(false);
    setFornecedorSearch("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Fotos */}
      <Card>
        <CardHeader>
          <CardTitle>Fotos do Relogio *</CardTitle>
        </CardHeader>
        <CardContent>
          <FotoUpload
            fotos={data.fotos}
            onChange={(fotos) => handleChange("fotos", fotos)}
          />
          {errors.fotos && (
            <p className="text-sm text-red-500 mt-2">{errors.fotos}</p>
          )}
        </CardContent>
      </Card>

      {/* Dados do Relogio */}
      <Card>
        <CardHeader>
          <CardTitle>Dados do Relogio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="marca">Marca *</Label>
              <Input
                id="marca"
                value={data.marca}
                onChange={(e) => handleChange("marca", e.target.value)}
                placeholder="Ex: Rolex, Omega, Seiko"
              />
              {errors.marca && (
                <p className="text-sm text-red-500">{errors.marca}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="modelo">Modelo *</Label>
              <Input
                id="modelo"
                value={data.modelo}
                onChange={(e) => handleChange("modelo", e.target.value)}
                placeholder="Ex: Submariner, Speedmaster"
              />
              {errors.modelo && (
                <p className="text-sm text-red-500">{errors.modelo}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ano">Ano</Label>
              <Input
                id="ano"
                type="number"
                value={data.ano}
                onChange={(e) => handleChange("ano", e.target.value)}
                placeholder="Ex: 1985"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tamanhoCaixa">Tamanho Caixa (mm) *</Label>
              <Input
                id="tamanhoCaixa"
                type="number"
                step="0.1"
                value={data.tamanhoCaixa}
                onChange={(e) => handleChange("tamanhoCaixa", e.target.value)}
                placeholder="Ex: 40"
              />
              {errors.tamanhoCaixa && (
                <p className="text-sm text-red-500">{errors.tamanhoCaixa}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="materialCaixa">Material Caixa</Label>
              <Select
                value={data.materialCaixa}
                onValueChange={(value) => handleChange("materialCaixa", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o material" />
                </SelectTrigger>
                <SelectContent>
                  {materiaisCaixa.map((material) => (
                    <SelectItem key={material} value={material}>
                      {material}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="materialPulseira">Material Pulseira</Label>
              <Select
                value={data.materialPulseira}
                onValueChange={(value) => handleChange("materialPulseira", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o material" />
                </SelectTrigger>
                <SelectContent>
                  {materiaisPulseira.map((material) => (
                    <SelectItem key={material} value={material}>
                      {material}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Valores e Origem */}
      <Card>
        <CardHeader>
          <CardTitle>Valores e Origem</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valorCompra">
                Valor de Compra (R$) {data.origemTipo === "COMPRA" && "*"}
              </Label>
              <Input
                id="valorCompra"
                type="number"
                step="0.01"
                value={data.origemTipo === "CONSIGNACAO" ? "" : data.valorCompra}
                onChange={(e) => handleChange("valorCompra", e.target.value)}
                placeholder={data.origemTipo === "CONSIGNACAO" ? "N/A - Consignacao" : "0,00"}
                disabled={data.origemTipo === "CONSIGNACAO"}
                className={data.origemTipo === "CONSIGNACAO" ? "bg-muted" : ""}
              />
              {data.origemTipo === "CONSIGNACAO" && (
                <p className="text-xs text-muted-foreground">
                  Em consignacao nao ha valor de compra
                </p>
              )}
              {errors.valorCompra && (
                <p className="text-sm text-red-500">{errors.valorCompra}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="valorEstimadoVenda">Valor Estimado Venda (R$) *</Label>
              <Input
                id="valorEstimadoVenda"
                type="number"
                step="0.01"
                value={data.valorEstimadoVenda}
                onChange={(e) => handleChange("valorEstimadoVenda", e.target.value)}
                placeholder="0,00"
              />
              {errors.valorEstimadoVenda && (
                <p className="text-sm text-red-500">{errors.valorEstimadoVenda}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="localizacao">Localizacao</Label>
              <Select
                value={data.localizacao}
                onValueChange={(value) => handleChange("localizacao", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {localizacoes?.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="origemTipo">Tipo de Origem *</Label>
              <Select
                value={data.origemTipo}
                onValueChange={(value) => {
                  handleChange("origemTipo", value);
                  // Limpar valor de compra se for consignacao
                  if (value === "CONSIGNACAO") {
                    handleChange("valorCompra", "");
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COMPRA">Compra</SelectItem>
                  <SelectItem value="CONSIGNACAO">Consignacao</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="origemCanal">Canal de Origem</Label>
              <Select
                value={data.origemCanal}
                onValueChange={(value) => handleChange("origemCanal", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PESSOA_FISICA">Pessoa Fisica</SelectItem>
                  <SelectItem value="LEILAO_BRASIL">Leilao Brasil</SelectItem>
                  <SelectItem value="EBAY">eBay</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {data.origemTipo === "CONSIGNACAO" && (
              <div className="space-y-2">
                <Label htmlFor="valorRepasse">Valor Repasse (R$) *</Label>
                <Input
                  id="valorRepasse"
                  type="number"
                  step="0.01"
                  value={data.valorRepasse}
                  onChange={(e) => handleChange("valorRepasse", e.target.value)}
                  placeholder="0,00"
                />
                {errors.valorRepasse && (
                  <p className="text-sm text-red-500">{errors.valorRepasse}</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Fornecedor */}
      <Card>
        <CardHeader>
          <CardTitle>Fornecedor *</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {fornecedorSelecionado ? (
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">{fornecedorSelecionado.nome}</p>
                <p className="text-sm text-muted-foreground">
                  {fornecedorSelecionado.cidade}/{fornecedorSelecionado.estado}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  handleChange("fornecedorId", "");
                  setShowFornecedorList(true);
                }}
              >
                Trocar
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={fornecedorSearch}
                  onChange={(e) => {
                    setFornecedorSearch(e.target.value);
                    setShowFornecedorList(true);
                  }}
                  onFocus={() => setShowFornecedorList(true)}
                  placeholder="Buscar fornecedor por nome ou CPF/CNPJ..."
                  className="pl-9"
                />
              </div>

              {showFornecedorList && fornecedores && fornecedores.fornecedores.length > 0 && (
                <div className="border rounded-lg divide-y max-h-48 overflow-auto">
                  {fornecedores.fornecedores.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      className="w-full p-3 text-left hover:bg-muted/50"
                      onClick={() => selectFornecedor(f.id)}
                    >
                      <p className="font-medium">{f.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        {f.cidade}/{f.estado}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              <Button
                type="button"
                variant="link"
                className="p-0 h-auto"
                onClick={() => setShowFornecedorModal(true)}
              >
                + Cadastrar novo fornecedor
              </Button>

              {errors.fornecedorId && (
                <p className="text-sm text-red-500">{errors.fornecedorId}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Fornecedor */}
      <FornecedorModal
        open={showFornecedorModal}
        onOpenChange={setShowFornecedorModal}
        onSuccess={(fornecedor) => {
          handleChange("fornecedorId", fornecedor.id);
          setShowFornecedorList(false);
          setFornecedorSearch("");
        }}
      />

      {/* Botoes */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? "Salvar Alteracoes" : "Cadastrar Peca"}
        </Button>
      </div>
    </form>
  );
}
