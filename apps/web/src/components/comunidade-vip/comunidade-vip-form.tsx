"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { MARCAS } from "@/components/watch-fit/constants";
import {
  FieldLabel,
  VipInput,
  VipSelect,
  VipButton,
  VipChip,
  VipCombobox,
  VipSectionHeading,
  VipSelectCard,
} from "./ui";

// =====================================================
// Tipos / constantes
// =====================================================

type FaixaRenda =
  | "ATE_100K"
  | "DE_100K_A_250K"
  | "DE_250K_A_500K"
  | "DE_500K_A_1M"
  | "ACIMA_1M"
  | "PREFIRO_NAO_INFORMAR";

type Objetivo =
  | "MELHORES_PRECOS"
  | "NETWORKING"
  | "EVENTOS"
  | "ACESSO_ANTECIPADO"
  | "WATCH_HUNT";

const FAIXA_RENDA_OPTIONS: { label: string; value: FaixaRenda }[] = [
  { label: "Até R$ 100.000", value: "ATE_100K" },
  { label: "R$ 100.000 – R$ 250.000", value: "DE_100K_A_250K" },
  { label: "R$ 250.000 – R$ 500.000", value: "DE_250K_A_500K" },
  { label: "R$ 500.000 – R$ 1.000.000", value: "DE_500K_A_1M" },
  { label: "Acima de R$ 1.000.000", value: "ACIMA_1M" },
  { label: "Prefiro não informar", value: "PREFIRO_NAO_INFORMAR" },
];

const OBJETIVOS: { value: Objetivo; title: string; description: string }[] = [
  {
    value: "MELHORES_PRECOS",
    title: "Melhores preços",
    description: "Condições especiais em peças do nosso acervo.",
  },
  {
    value: "NETWORKING",
    title: "Networking",
    description: "Conhecer outros colecionadores e entusiastas.",
  },
  {
    value: "EVENTOS",
    title: "Eventos",
    description: "Encontros presenciais, lançamentos e experiências.",
  },
  {
    value: "ACESSO_ANTECIPADO",
    title: "Acesso antecipado",
    description: "Ver as peças antes de irem ao público.",
  },
  {
    value: "WATCH_HUNT",
    title: "Watch Hunt",
    description: "Caçamos a peça específica que você procura.",
  },
];

const MARCAS_LISTA = MARCAS.filter((m) => m !== "Outra");

interface FormState {
  // Seção 1
  nome: string;
  celular: string;
  email: string;
  nascimento: string;
  profissao: string;
  faixaRendaAnual: "" | FaixaRenda;
  // Seção 2
  linkedinUrl: string;
  jaColeciona: "" | "SIM" | "NAO";
  marcasColecao: string[];
  marcaPreferida: string;
  relogioDosSonhos: string;
  maximoPagoRelogio: string;
  // Seção 3
  objetivosComunidade: Objetivo[];
}

const INITIAL: FormState = {
  nome: "",
  celular: "",
  email: "",
  nascimento: "",
  profissao: "",
  faixaRendaAnual: "",
  linkedinUrl: "",
  jaColeciona: "",
  marcasColecao: [],
  marcaPreferida: "",
  relogioDosSonhos: "",
  maximoPagoRelogio: "",
  objetivosComunidade: [],
};

type Errors = Partial<Record<keyof FormState, string>>;

// =====================================================
// Componente principal
// =====================================================

export function ComunidadeVipForm() {
  const [data, setData] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function toggleMarcaColecao(marca: string) {
    setData((prev) => ({
      ...prev,
      marcasColecao: prev.marcasColecao.includes(marca)
        ? prev.marcasColecao.filter((m) => m !== marca)
        : [...prev.marcasColecao, marca],
    }));
  }

  function toggleObjetivo(obj: Objetivo) {
    setData((prev) => ({
      ...prev,
      objetivosComunidade: prev.objetivosComunidade.includes(obj)
        ? prev.objetivosComunidade.filter((o) => o !== obj)
        : [...prev.objetivosComunidade, obj],
    }));
  }

  function validate(): boolean {
    const e: Errors = {};

    if (!data.nome.trim() || data.nome.trim().length < 2)
      e.nome = "Informe seu nome completo";

    const celDigits = data.celular.replace(/\D/g, "");
    if (celDigits.length < 10) e.celular = "Informe um celular válido (com DDD)";

    if (!isValidEmail(data.email)) e.email = "Informe um e-mail válido";

    if (!data.nascimento) {
      e.nascimento = "Informe sua data de nascimento";
    } else {
      const d = new Date(data.nascimento);
      if (Number.isNaN(d.getTime())) e.nascimento = "Data inválida";
      else if (d > new Date()) e.nascimento = "Data não pode ser no futuro";
    }

    if (!data.profissao.trim() || data.profissao.trim().length < 2)
      e.profissao = "Informe sua profissão";

    if (!data.faixaRendaAnual) e.faixaRendaAnual = "Selecione uma faixa";

    if (data.linkedinUrl.trim() && !isValidOptionalUrl(data.linkedinUrl))
      e.linkedinUrl = "Informe um link válido (incluindo https://)";

    if (!data.jaColeciona) e.jaColeciona = "Selecione uma opção";

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // -------- SUBMISSÃO --------
  const mutation = useMutation(
    trpc.leadVip.create.mutationOptions({
      onSuccess: () => {
        setSubmitted(true);
      },
      onError: (err) => {
        setSubmitError(err.message || "Não foi possível enviar. Tente novamente.");
      },
    }),
  );

  function handleSubmit() {
    setSubmitError(null);
    if (!validate()) {
      // Rolar até o primeiro erro
      const firstErrorEl = document.querySelector("[data-vip-error='true']");
      firstErrorEl?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    mutation.mutate({
      nome: data.nome.trim(),
      celular: data.celular.trim(),
      email: data.email.trim(),
      nascimento: data.nascimento,
      profissao: data.profissao.trim(),
      faixaRendaAnual: data.faixaRendaAnual as FaixaRenda,
      linkedinUrl: data.linkedinUrl.trim() || null,
      jaColeciona: data.jaColeciona === "SIM",
      marcasColecao: data.jaColeciona === "SIM" ? data.marcasColecao : [],
      marcaPreferida: data.marcaPreferida || null,
      relogioDosSonhos: data.relogioDosSonhos.trim() || null,
      maximoPagoRelogio: data.maximoPagoRelogio.trim() || null,
      objetivosComunidade: data.objetivosComunidade,
    });
  }

  if (submitted) {
    return <SuccessScreen />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 w-full max-w-[640px] mx-auto px-5 sm:px-8 pb-24">
        {/* Hero */}
        <section className="pt-10 sm:pt-16 pb-10 sm:pb-14 animate-vip-fade">
          <div className="text-[10px] tracking-[0.5em] uppercase text-[#C9A84C] mb-4">
            Comunidade VIP
          </div>
          <h1
            className="text-[2.25rem] sm:text-[3rem] leading-[1.05] text-[#F5F3EF] mb-6"
            style={{ fontFamily: "var(--font-playfair), serif" }}
          >
            Um círculo para quem busca além do relógio.
          </h1>
          <p className="text-[15px] sm:text-base leading-relaxed text-[#A0A0A0] max-w-xl">
            Um espaço exclusivo para colecionadores e entusiastas que buscam mais
            do que peças — buscam experiências, conexões e acesso privilegiado ao
            melhor da alta relojoaria. Preencha abaixo para fazer parte.
          </p>
        </section>

        {/* Linha divisória dourada */}
        <div className="h-px bg-gradient-to-r from-transparent via-[#C9A84C]/40 to-transparent mb-12" />

        {/* SEÇÃO 1 — Sobre você */}
        <section className="mb-14 animate-vip-fade [animation-delay:0.1s]">
          <VipSectionHeading
            number="01"
            title="Sobre você"
            description="As informações básicas para conhecermos quem está aplicando."
          />

          <div className="space-y-5">
            <div data-vip-error={Boolean(errors.nome)}>
              <FieldLabel htmlFor="vip-nome" required>
                Nome completo
              </FieldLabel>
              <VipInput
                id="vip-nome"
                value={data.nome}
                onChange={(e) => update("nome", e.target.value)}
                placeholder="Seu nome"
                autoComplete="name"
                error={errors.nome}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div data-vip-error={Boolean(errors.celular)}>
                <FieldLabel htmlFor="vip-celular" required hint="com DDD">
                  Celular
                </FieldLabel>
                <VipInput
                  id="vip-celular"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={data.celular}
                  onChange={(e) => update("celular", maskPhone(e.target.value))}
                  placeholder="(11) 99999-9999"
                  error={errors.celular}
                />
              </div>
              <div data-vip-error={Boolean(errors.email)}>
                <FieldLabel htmlFor="vip-email" required>
                  E-mail
                </FieldLabel>
                <VipInput
                  id="vip-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={data.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="voce@exemplo.com"
                  error={errors.email}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div data-vip-error={Boolean(errors.nascimento)}>
                <FieldLabel htmlFor="vip-nascimento" required>
                  Data de nascimento
                </FieldLabel>
                <VipInput
                  id="vip-nascimento"
                  type="date"
                  value={data.nascimento}
                  onChange={(e) => update("nascimento", e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                  error={errors.nascimento}
                />
              </div>
              <div data-vip-error={Boolean(errors.profissao)}>
                <FieldLabel htmlFor="vip-profissao" required>
                  Profissão
                </FieldLabel>
                <VipInput
                  id="vip-profissao"
                  value={data.profissao}
                  onChange={(e) => update("profissao", e.target.value)}
                  placeholder="Ex.: Empresário, Médico, Investidor..."
                  error={errors.profissao}
                />
              </div>
            </div>

            <div data-vip-error={Boolean(errors.faixaRendaAnual)}>
              <FieldLabel htmlFor="vip-faixa" required hint="confidencial">
                Faixa de renda anual
              </FieldLabel>
              <VipSelect
                id="vip-faixa"
                value={data.faixaRendaAnual}
                onChange={(v) => update("faixaRendaAnual", v as FaixaRenda)}
                options={FAIXA_RENDA_OPTIONS}
                placeholder="Selecione uma faixa"
                error={errors.faixaRendaAnual}
              />
            </div>
          </div>
        </section>

        {/* SEÇÃO 2 — Sua coleção */}
        <section className="mb-14 animate-vip-fade [animation-delay:0.2s]">
          <VipSectionHeading
            number="02"
            title="Sua coleção"
            description="Conte um pouco sobre seu universo relojoeiro — não há respostas certas."
          />

          <div className="space-y-7">
            <div data-vip-error={Boolean(errors.linkedinUrl)}>
              <FieldLabel htmlFor="vip-linkedin" hint="opcional">
                LinkedIn
              </FieldLabel>
              <VipInput
                id="vip-linkedin"
                type="url"
                inputMode="url"
                value={data.linkedinUrl}
                onChange={(e) => update("linkedinUrl", e.target.value)}
                placeholder="https://linkedin.com/in/seu-perfil"
                error={errors.linkedinUrl}
              />
            </div>

            <div data-vip-error={Boolean(errors.jaColeciona)}>
              <FieldLabel required>Já coleciona relógios?</FieldLabel>
              <div className="grid grid-cols-2 gap-3">
                <VipSelectCard
                  selected={data.jaColeciona === "SIM"}
                  onClick={() => update("jaColeciona", "SIM")}
                  title="Sim"
                  description="Já tenho peças na minha coleção."
                />
                <VipSelectCard
                  selected={data.jaColeciona === "NAO"}
                  onClick={() => {
                    update("jaColeciona", "NAO");
                    setData((prev) => ({ ...prev, marcasColecao: [] }));
                  }}
                  title="Ainda não"
                  description="Estou começando minha jornada."
                />
              </div>
              {errors.jaColeciona && (
                <p className="mt-2 text-xs text-[#E15B5B]">{errors.jaColeciona}</p>
              )}
            </div>

            {data.jaColeciona === "SIM" && (
              <div className="animate-vip-fade">
                <FieldLabel hint={`${data.marcasColecao.length} selecionada(s)`}>
                  Quais marcas possui na coleção?
                </FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {MARCAS_LISTA.map((marca) => (
                    <VipChip
                      key={marca}
                      selected={data.marcasColecao.includes(marca)}
                      onClick={() => toggleMarcaColecao(marca)}
                    >
                      {marca}
                    </VipChip>
                  ))}
                </div>
              </div>
            )}

            <div>
              <FieldLabel htmlFor="vip-marca-preferida" hint="opcional">
                Qual sua marca preferida?
              </FieldLabel>
              <VipCombobox
                value={data.marcaPreferida}
                onChange={(v) => update("marcaPreferida", v)}
                options={MARCAS_LISTA}
                placeholder="Selecione ou busque uma marca"
                searchPlaceholder="Buscar marca..."
              />
            </div>

            <div>
              <FieldLabel htmlFor="vip-sonhos" hint="opcional">
                Qual o relógio dos seus sonhos?
              </FieldLabel>
              <VipInput
                id="vip-sonhos"
                value={data.relogioDosSonhos}
                onChange={(e) => update("relogioDosSonhos", e.target.value)}
                placeholder="Ex.: Patek Philippe Nautilus 5711"
              />
            </div>

            <div>
              <FieldLabel htmlFor="vip-maximo" hint="opcional">
                Qual o máximo que já pagou em um relógio?
              </FieldLabel>
              <VipInput
                id="vip-maximo"
                value={data.maximoPagoRelogio}
                onChange={(e) => update("maximoPagoRelogio", e.target.value)}
                placeholder="Escreva como preferir"
              />
            </div>
          </div>
        </section>

        {/* SEÇÃO 3 — O que você busca */}
        <section className="mb-14 animate-vip-fade [animation-delay:0.3s]">
          <VipSectionHeading
            number="03"
            title="O que você busca"
            description="Marque tudo que faz sentido — você pode escolher mais de um."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {OBJETIVOS.map((obj) => (
              <VipSelectCard
                key={obj.value}
                selected={data.objetivosComunidade.includes(obj.value)}
                onClick={() => toggleObjetivo(obj.value)}
                title={obj.title}
                description={obj.description}
              />
            ))}
          </div>
        </section>

        {/* Submit */}
        <div className="pt-4 border-t border-white/[0.06] animate-vip-fade [animation-delay:0.4s]">
          <p className="text-xs text-[#6B6B6B] mb-6 leading-relaxed">
            Ao enviar, você autoriza a Mr. Chrono a entrar em contato pelos canais
            informados. Suas informações são tratadas com discrição absoluta.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <VipButton
              onClick={handleSubmit}
              loading={mutation.isPending}
              className="w-full sm:w-auto"
            >
              {mutation.isPending ? "Enviando..." : "Quero fazer parte"}
            </VipButton>
            <p className="text-xs text-[#6B6B6B] sm:ml-2">
              Análise em até 7 dias úteis.
            </p>
          </div>

          {submitError && (
            <div className="mt-6 p-4 border border-[#E15B5B]/40 bg-[#E15B5B]/[0.06] rounded-sm">
              <p className="text-sm text-[#E15B5B]">{submitError}</p>
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* CSS local */}
      <style>{`
        @keyframes vip-fade {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-vip-fade { animation: vip-fade 0.6s ease-out both; }

        /* Calendário do input date em tema escuro */
        .comunidade-vip-root input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(0.7) sepia(0.2) saturate(2) hue-rotate(15deg);
          opacity: 0.7;
          cursor: pointer;
        }
        .comunidade-vip-root input[type="date"]::-webkit-calendar-picker-indicator:hover {
          opacity: 1;
        }
      `}</style>
    </div>
  );
}

// =====================================================
// Header / Footer
// =====================================================

function Header() {
  return (
    <header className="w-full border-b border-white/[0.06]">
      <div className="max-w-[640px] mx-auto px-5 sm:px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full border border-[#C9A84C] flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-[#C9A84C]" />
          </div>
          <span
            className="text-base tracking-[0.18em] uppercase text-[#F5F3EF]"
            style={{ fontFamily: "var(--font-playfair), serif" }}
          >
            Mr. Chrono
          </span>
        </div>
        <span className="text-[10px] tracking-[0.3em] uppercase text-[#A0A0A0] hidden sm:inline">
          Comunidade VIP
        </span>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/[0.06] mt-auto">
      <div className="max-w-[640px] mx-auto px-5 sm:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#6B6B6B]">
        <span className="tracking-[0.2em] uppercase">Mr. Chrono &copy; {new Date().getFullYear()}</span>
        <a
          href="https://instagram.com/mrchrono"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[#C9A84C] transition-colors"
        >
          @mrchrono
        </a>
      </div>
    </footer>
  );
}

// =====================================================
// SUCCESS SCREEN
// =====================================================

function SuccessScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16 text-center animate-vip-fade">
      <div className="mb-8 inline-flex items-center justify-center w-16 h-16 rounded-full border border-[#C9A84C] shadow-[0_0_32px_rgba(201,168,76,0.18)]">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 12l4 4 10-10"
            stroke="#C9A84C"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="text-[10px] tracking-[0.5em] uppercase text-[#C9A84C] mb-3">
        Comunidade VIP Chrono
      </div>

      <h1
        className="text-[2.25rem] sm:text-[2.75rem] leading-[1.1] text-[#F5F3EF] mb-6 max-w-xl"
        style={{ fontFamily: "var(--font-playfair), serif" }}
      >
        Bem-vindo ao círculo.
      </h1>

      <p className="text-[15px] sm:text-base leading-relaxed text-[#A0A0A0] max-w-md mb-2">
        Sua aplicação foi recebida. Nossa equipe vai analisar seu perfil e entrar
        em contato em breve.
      </p>
      <p className="text-[15px] sm:text-base leading-relaxed text-[#A0A0A0] max-w-md mb-10">
        Enquanto isso, siga{" "}
        <a
          href="https://instagram.com/mrchrono"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#C9A84C] hover:underline underline-offset-4"
        >
          @mrchrono
        </a>{" "}
        para acompanhar as novidades.
      </p>

      <a
        href="https://instagram.com/mrchrono"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 min-h-12 px-8 rounded-sm
          text-sm font-medium tracking-[0.14em] uppercase
          bg-[#C9A84C] text-[#0A0A0A] hover:bg-[#D9B95C] hover:shadow-[0_0_24px_rgba(201,168,76,0.25)]
          transition-all duration-300"
      >
        Ir ao Instagram
      </a>

      <style>{`
        @keyframes vip-fade {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-vip-fade { animation: vip-fade 0.6s ease-out both; }
      `}</style>
    </div>
  );
}

// =====================================================
// HELPERS
// =====================================================

function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

function isValidOptionalUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  try {
    const u = new URL(trimmed);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function maskPhone(value: string): string {
  const hasPlus = value.trim().startsWith("+");
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (hasPlus) {
    return `+${digits}`.slice(0, 16);
  }
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}
