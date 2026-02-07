"use client";

import { useSession } from "./use-session";

export type NivelAcesso = "ADMINISTRADOR" | "SOCIO" | "FUNCIONARIO";

export interface Permissions {
  // Níveis
  isAdmin: boolean;
  isSocio: boolean;
  isFuncionario: boolean;

  // Permissões de visualização
  podeVerValores: boolean;

  // Permissões de ação
  podeExcluir: boolean;
  podeEditarVendida: boolean;
  podeAcessarAdmin: boolean;
  podeCancelarVenda: boolean;
  podeRegistrarRepasse: boolean;
  podeEditarDataVenda: boolean;

  // Nível atual
  nivel: NivelAcesso | null;

  // Estado de carregamento
  isLoading: boolean;
}

export function usePermissions(): Permissions {
  const { data: session, isPending } = useSession();

  // O nível vem do campo customizado que adicionamos ao User
  const nivel = (session?.user as { nivel?: NivelAcesso } | undefined)?.nivel;

  const isAdmin = nivel === "ADMINISTRADOR";
  const isSocio = nivel === "SOCIO";
  const isFuncionario = nivel === "FUNCIONARIO";

  // Sócio e Admin podem ver valores em R$
  const podeVerValores = isAdmin || isSocio;

  // Todos os níveis podem excluir/arquivar
  const podeExcluir = isAdmin || isSocio || isFuncionario;

  // Sócio e Admin podem editar peça vendida
  const podeEditarVendida = isAdmin || isSocio;

  // Apenas Admin acessa painel admin
  const podeAcessarAdmin = isAdmin;

  // Sócio e Admin podem cancelar vendas
  const podeCancelarVenda = isAdmin || isSocio;

  // Sócio e Admin podem registrar repasse
  const podeRegistrarRepasse = isAdmin || isSocio;

  // Sócio e Admin podem editar data da venda
  const podeEditarDataVenda = isAdmin || isSocio;

  return {
    isAdmin,
    isSocio,
    isFuncionario,
    podeVerValores,
    podeExcluir,
    podeEditarVendida,
    podeAcessarAdmin,
    podeCancelarVenda,
    podeRegistrarRepasse,
    podeEditarDataVenda,
    nivel: nivel ?? null,
    isLoading: isPending,
  };
}
