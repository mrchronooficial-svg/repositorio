"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import {
  CONDICOES,
  CORES_MOSTRADOR,
  ESTILOS,
  FAIXAS_INVESTIMENTO,
  MARCAS,
  SITE_URL,
  TAMANHOS_CAIXA,
  TIPOS_PULSEIRA,
} from "./constants";
import {
  Chip,
  ColorSwatch,
  FieldLabel,
  LuxButton,
  LuxCombobox,
  LuxInput,
  LuxSelect,
  LuxTextarea,
  SelectCard,
} from "./ui";

// =====================================================
// Tipos
// =====================================================
type TipoBusca = "ESPECIFICO" | "DESCOBERTA";
type Condicao = "COMPLETO" | "SOMENTE_RELOGIO" | "TANTO_FAZ";

interface FormState {
  // Step 1 — Dados pessoais
  nome: string;
  email: string;
  whatsapp: string;
  instagram: string;
  // Step 2 — Tipo
  tipoBusca: TipoBusca | null;
  // Step 3A — Modelo específico
  modeloMarca: string; // "" ou um item de MARCAS
  modeloMarcaOutra: string; // preenchido se modeloMarca === "Outra"
  modeloNome: string;
  modeloTamanhoCaixa: string;
  modeloReferencia: string;
  modeloCondicao: Condicao | "";
  modeloLinkExemplo: string;
  modeloObservacoes: string;
  // Step 3B — Descoberta
  descobertaEstilo: string[];
  descobertaMarcasInteresse: string[];
  descobertaTipoPulseira: string[];
  descobertaCorMostrador: string[];
  descobertaTamanhoCaixa: string;
  descobertaFaixaInvestimento: string;
  descobertaObservacoes: string;
  // Step 4 — Confirmação
  aceiteComunicacao: boolean;
}

const INITIAL: FormState = {
  nome: "",
  email: "",
  whatsapp: "",
  instagram: "",
  tipoBusca: null,
  modeloMarca: "",
  modeloMarcaOutra: "",
  modeloNome: "",
  modeloTamanhoCaixa: "",
  modeloReferencia: "",
  modeloCondicao: "",
  modeloLinkExemplo: "",
  modeloObservacoes: "",
  descobertaEstilo: [],
  descobertaMarcasInteresse: [],
  descobertaTipoPulseira: [],
  descobertaCorMostrador: [],
  descobertaTamanhoCaixa: "",
  descobertaFaixaInvestimento: "",
  descobertaObservacoes: "",
  aceiteComunicacao: false,
};

const TOTAL_STEPS = 4; // pessoais, tipo, detalhes (espec OU desc), confirmação
const SUCCESS_STEP = 4;

// =====================================================
// Wizard
// =====================================================
export function WatchFitWizard() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setData((d) => ({ ...d, [key]: value }));
    if (errors[key as string]) {
      setErrors((e) => {
        const { [key as string]: _omit, ...rest } = e;
        return rest;
      });
    }
  }

  function toggleArrayValue(key: keyof FormState, value: string) {
    setData((d) => {
      const arr = d[key] as string[];
      const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
      return { ...d, [key]: next as FormState[typeof key] };
    });
  }

  // -------- VALIDAÇÕES --------
  function validateStep(s: number): boolean {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (data.nome.trim().length < 2) e.nome = "Informe seu nome completo";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) e.email = "E-mail inválido";
      const wa = data.whatsapp.replace(/\D/g, "");
      if (wa.length < 10) e.whatsapp = "Informe um WhatsApp válido (com DDD)";
    }
    if (s === 1) {
      if (!data.tipoBusca) e.tipoBusca = "Selecione uma opção";
    }
    if (s === 2 && data.tipoBusca === "ESPECIFICO") {
      const marcaFinal =
        data.modeloMarca === "Outra" ? data.modeloMarcaOutra.trim() : data.modeloMarca;
      if (!marcaFinal) e.modeloMarca = "Selecione ou informe a marca";
      if (!data.modeloNome.trim()) e.modeloNome = "Informe o modelo";
      if (!data.modeloCondicao) e.modeloCondicao = "Selecione a condição";
      if (!isValidOptionalUrl(data.modeloLinkExemplo))
        e.modeloLinkExemplo = "Informe uma URL válida (com http:// ou https://)";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateLinkOnBlur() {
    if (!isValidOptionalUrl(data.modeloLinkExemplo)) {
      setErrors((prev) => ({
        ...prev,
        modeloLinkExemplo: "Informe uma URL válida (com http:// ou https://)",
      }));
    }
  }

  // -------- NAVEGAÇÃO --------
  function goNext() {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(SUCCESS_STEP, s + 1));
  }

  function goBack() {
    setSubmitError(null);
    setStep((s) => Math.max(0, s - 1));
  }

  // -------- SUBMISSÃO --------
  const mutation = useMutation(
    trpc.lead.create.mutationOptions({
      onSuccess: () => {
        setStep(SUCCESS_STEP);
      },
      onError: (err) => {
        setSubmitError(err.message || "Não foi possível enviar. Tente novamente.");
      },
    }),
  );

  function handleSubmit() {
    if (!data.tipoBusca) return;
    setSubmitError(null);

    const marcaFinal =
      data.tipoBusca === "ESPECIFICO" && data.modeloMarca === "Outra"
        ? data.modeloMarcaOutra.trim()
        : data.modeloMarca;

    const isEspec = data.tipoBusca === "ESPECIFICO";
    const isDesc = data.tipoBusca === "DESCOBERTA";

    mutation.mutate({
      nome: data.nome.trim(),
      email: data.email.trim(),
      whatsapp: data.whatsapp.trim(),
      instagram: data.instagram.trim() || null,
      tipoBusca: data.tipoBusca,
      modeloMarca: isEspec ? marcaFinal || null : null,
      modeloNome: isEspec ? data.modeloNome.trim() || null : null,
      modeloTamanhoCaixa: isEspec ? data.modeloTamanhoCaixa.trim() || null : null,
      modeloReferencia: isEspec ? data.modeloReferencia.trim() || null : null,
      modeloCondicao: isEspec && data.modeloCondicao ? (data.modeloCondicao as Condicao) : null,
      modeloLinkExemplo: isEspec ? data.modeloLinkExemplo.trim() || null : null,
      modeloObservacoes: isEspec ? data.modeloObservacoes.trim() || null : null,
      descobertaEstilo: isDesc ? data.descobertaEstilo : [],
      descobertaMarcasInteresse: isDesc ? data.descobertaMarcasInteresse : [],
      descobertaTipoPulseira: isDesc ? data.descobertaTipoPulseira : [],
      descobertaCorMostrador: isDesc ? data.descobertaCorMostrador : [],
      descobertaTamanhoCaixa: isDesc ? data.descobertaTamanhoCaixa || null : null,
      descobertaFaixaInvestimento: isDesc ? data.descobertaFaixaInvestimento || null : null,
      descobertaObservacoes: isDesc ? data.descobertaObservacoes.trim() || null : null,
      aceiteComunicacao: data.aceiteComunicacao,
    });
  }

  // =====================================================
  // RENDER
  // =====================================================
  if (step === SUCCESS_STEP) {
    return <SuccessScreen />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 w-full max-w-[640px] mx-auto px-5 sm:px-8 pb-20">
        <ProgressBar current={step} total={TOTAL_STEPS} />

        {/* Container animado por step */}
        <div key={step} className="animate-watch-fade">
          {step === 0 && (
            <StepPessoais
              data={data}
              update={update}
              errors={errors}
              setWhatsapp={(v) => update("whatsapp", maskPhone(v))}
            />
          )}
          {step === 1 && (
            <StepTipo
              tipoBusca={data.tipoBusca}
              onSelect={(t) => {
                update("tipoBusca", t);
                // avança automaticamente
                setTimeout(() => setStep((s) => Math.min(SUCCESS_STEP, s + 1)), 250);
              }}
              error={errors.tipoBusca}
            />
          )}
          {step === 2 && data.tipoBusca === "ESPECIFICO" && (
            <StepEspecifico
              data={data}
              update={update}
              errors={errors}
              onBlurLink={validateLinkOnBlur}
            />
          )}
          {step === 2 && data.tipoBusca === "DESCOBERTA" && (
            <StepDescoberta data={data} update={update} toggleArrayValue={toggleArrayValue} />
          )}
          {step === 3 && (
            <StepConfirmacao
              data={data}
              setAceite={(v) => update("aceiteComunicacao", v)}
              submitError={submitError}
            />
          )}
        </div>

        {/* Navegação (omitida no step 1, que avança automaticamente) */}
        {step !== 1 && (
          <div className="mt-12 flex items-center justify-between gap-4">
            {step > 0 ? (
              <LuxButton variant="ghost" onClick={goBack} disabled={mutation.isPending}>
                <span aria-hidden>←</span> Voltar
              </LuxButton>
            ) : (
              <span />
            )}

            {step < 3 ? (
              <LuxButton onClick={goNext}>
                Continuar <span aria-hidden>→</span>
              </LuxButton>
            ) : (
              <LuxButton onClick={handleSubmit} loading={mutation.isPending}>
                {mutation.isPending ? "Enviando..." : "Enviar meu Watch Fit"}
              </LuxButton>
            )}
          </div>
        )}
      </main>

      {/* CSS local */}
      <style>{`
        @keyframes watch-fade {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-watch-fade { animation: watch-fade 0.45s ease-out both; }

        @keyframes watch-stagger {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .stagger > * {
          opacity: 0;
          animation: watch-stagger 0.5s ease-out forwards;
        }
        .stagger > *:nth-child(1) { animation-delay: 0.05s; }
        .stagger > *:nth-child(2) { animation-delay: 0.12s; }
        .stagger > *:nth-child(3) { animation-delay: 0.19s; }
        .stagger > *:nth-child(4) { animation-delay: 0.26s; }
        .stagger > *:nth-child(5) { animation-delay: 0.33s; }
        .stagger > *:nth-child(6) { animation-delay: 0.40s; }
        .stagger > *:nth-child(7) { animation-delay: 0.47s; }
      `}</style>
    </div>
  );
}

// =====================================================
// HEADER (logo + título)
// =====================================================
function Header() {
  return (
    <header className="w-full border-b border-[#E5E2DD]/70 bg-[#F5F3EF]/80 backdrop-blur-sm">
      <div className="max-w-[640px] mx-auto px-5 sm:px-8 py-6 flex items-center justify-center">
        <div className="text-center">
          <div className="text-[10px] tracking-[0.4em] uppercase text-[#9A958C] mb-1">
            Mr. Chrono
          </div>
          <div
            className="text-base text-[#1A1A1A]"
            style={{ fontFamily: "var(--font-playfair), serif", letterSpacing: "0.05em" }}
          >
            ⌚
          </div>
        </div>
      </div>
    </header>
  );
}

// =====================================================
// PROGRESS BAR
// =====================================================
function ProgressBar({ current, total }: { current: number; total: number }) {
  // current 0..total-1 → progresso = (current+1)/total
  const pct = Math.min(100, ((current + 1) / total) * 100);
  return (
    <div className="pt-10 pb-2">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[11px] tracking-[0.2em] uppercase text-[#9A958C]">
          Etapa {current + 1} de {total}
        </span>
        <span className="text-[11px] tracking-[0.15em] uppercase text-[#9A958C] tabular-nums">
          {Math.round(pct)}%
        </span>
      </div>
      <div className="h-px bg-[#E5E2DD] relative overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full bg-[#B8960C] transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// =====================================================
// STEP: ABERTURA DENTRO DE CADA STEP
// =====================================================
function StepIntro({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return (
    <div className="mt-10 mb-10">
      {eyebrow && (
        <div className="text-[11px] tracking-[0.3em] uppercase text-[#B8960C] mb-3">
          {eyebrow}
        </div>
      )}
      <h1
        className="text-[2rem] sm:text-[2.5rem] leading-[1.15] text-[#1A1A1A] mb-4"
        style={{ fontFamily: "var(--font-playfair), serif" }}
      >
        {title}
      </h1>
      {description && (
        <p className="text-[15px] sm:text-base leading-relaxed text-[#5C5852] max-w-prose">
          {description}
        </p>
      )}
    </div>
  );
}

// =====================================================
// STEP 1 — Dados pessoais
// =====================================================
interface StepPessoaisProps {
  data: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  errors: Record<string, string>;
  setWhatsapp: (v: string) => void;
}

function StepPessoais({ data, update, errors, setWhatsapp }: StepPessoaisProps) {
  return (
    <>
      <StepIntro
        eyebrow="Watch Fit — Curadoria & Encomenda"
        title="Cada pulso conta uma história."
        description="Conte-nos um pouco sobre você. Em seguida vamos entender exatamente o que você procura para apresentarmos as peças certas, em primeira mão."
      />

      <div className="space-y-7 stagger">
        <div>
          <FieldLabel htmlFor="nome" required>
            Nome completo
          </FieldLabel>
          <LuxInput
            id="nome"
            type="text"
            autoComplete="name"
            value={data.nome}
            onChange={(e) => update("nome", e.target.value)}
            error={errors.nome}
            placeholder="Como prefere ser chamado(a)"
          />
        </div>

        <div>
          <FieldLabel htmlFor="email" required>
            E-mail
          </FieldLabel>
          <LuxInput
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={data.email}
            onChange={(e) => update("email", e.target.value)}
            error={errors.email}
            placeholder="seu@email.com"
          />
        </div>

        <div>
          <FieldLabel htmlFor="whatsapp" required hint="com DDD ou DDI">
            WhatsApp
          </FieldLabel>
          <LuxInput
            id="whatsapp"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            value={data.whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            error={errors.whatsapp}
            placeholder="(11) 99999-9999"
          />
        </div>

        <div>
          <FieldLabel htmlFor="instagram" hint="opcional">
            Instagram
          </FieldLabel>
          <LuxInput
            id="instagram"
            type="text"
            value={data.instagram}
            onChange={(e) => update("instagram", e.target.value.replace(/^@+/, ""))}
            prefix="@"
            placeholder="seuusuario"
          />
        </div>
      </div>
    </>
  );
}

// =====================================================
// STEP 2 — Tipo de busca
// =====================================================
function StepTipo({
  tipoBusca,
  onSelect,
  error,
}: {
  tipoBusca: TipoBusca | null;
  onSelect: (t: TipoBusca) => void;
  error?: string;
}) {
  return (
    <>
      <StepIntro
        eyebrow="Etapa 02"
        title="Já tem um modelo em mente?"
        description="Isso nos ajuda a direcionar a curadoria — seja para encontrar uma peça específica ou para apresentar opções sob medida para o seu estilo."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 stagger">
        <SelectCard
          selected={tipoBusca === "ESPECIFICO"}
          onClick={() => onSelect("ESPECIFICO")}
          title="Sim, tenho um modelo"
          description="Procuro uma referência específica para encomenda."
        />
        <SelectCard
          selected={tipoBusca === "DESCOBERTA"}
          onClick={() => onSelect("DESCOBERTA")}
          title="Não, quero descobrir"
          description="Quero apresentar meu estilo e receber sugestões personalizadas."
        />
      </div>

      {error && (
        <p className="mt-4 text-xs text-[#9B2C2C] text-center">{error}</p>
      )}
    </>
  );
}

// =====================================================
// STEP 3A — Modelo específico
// =====================================================
function StepEspecifico({
  data,
  update,
  errors,
  onBlurLink,
}: {
  data: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  errors: Record<string, string>;
  onBlurLink: () => void;
}) {
  return (
    <>
      <StepIntro
        eyebrow="Encomenda"
        title="Conte-nos sobre o relógio"
        description="Quanto mais detalhes você puder compartilhar, mais precisa será nossa busca."
      />

      <div className="space-y-7 stagger">
        <div>
          <FieldLabel required>Marca</FieldLabel>
          <LuxCombobox
            value={data.modeloMarca}
            onChange={(v) => update("modeloMarca", v)}
            options={MARCAS as unknown as string[]}
            placeholder="Selecione uma marca"
            searchPlaceholder="Buscar marca..."
            emptyMessage="Nenhuma marca encontrada"
            error={errors.modeloMarca}
          />
          {data.modeloMarca === "Outra" && (
            <div className="mt-3">
              <LuxInput
                placeholder="Qual marca?"
                value={data.modeloMarcaOutra}
                onChange={(e) => update("modeloMarcaOutra", e.target.value)}
              />
            </div>
          )}
        </div>

        <div>
          <FieldLabel htmlFor="modeloNome" required>
            Modelo
          </FieldLabel>
          <LuxInput
            id="modeloNome"
            value={data.modeloNome}
            onChange={(e) => update("modeloNome", e.target.value)}
            placeholder="Ex: Submariner, Speedmaster, Royal Oak…"
            error={errors.modeloNome}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <FieldLabel htmlFor="tamCaixa" hint="opcional">
              Tamanho da caixa
            </FieldLabel>
            <LuxInput
              id="tamCaixa"
              value={data.modeloTamanhoCaixa}
              onChange={(e) => update("modeloTamanhoCaixa", e.target.value)}
              placeholder="Ex: 41mm"
            />
          </div>
          <div>
            <FieldLabel htmlFor="ref" hint="opcional">
              Nº de referência
            </FieldLabel>
            <LuxInput
              id="ref"
              value={data.modeloReferencia}
              onChange={(e) => update("modeloReferencia", e.target.value)}
              placeholder="Ex: 116610LN"
            />
          </div>
        </div>

        <div>
          <FieldLabel htmlFor="condicao" required>
            Condição desejada
          </FieldLabel>
          <LuxSelect
            id="condicao"
            value={data.modeloCondicao}
            onChange={(v) => update("modeloCondicao", v as Condicao | "")}
            options={CONDICOES as unknown as { label: string; value: string }[]}
            placeholder="Como você prefere?"
            error={errors.modeloCondicao}
          />
        </div>

        <div>
          <FieldLabel htmlFor="link" hint="opcional">
            Link de exemplo
          </FieldLabel>
          <LuxInput
            id="link"
            type="url"
            inputMode="url"
            value={data.modeloLinkExemplo}
            onChange={(e) => update("modeloLinkExemplo", e.target.value)}
            onBlur={onBlurLink}
            placeholder="https://…"
            error={errors.modeloLinkExemplo}
          />
        </div>

        <div>
          <FieldLabel htmlFor="obs" hint="opcional">
            Observações
          </FieldLabel>
          <LuxTextarea
            id="obs"
            value={data.modeloObservacoes}
            onChange={(e) => update("modeloObservacoes", e.target.value)}
            placeholder="Detalhes que possam nos ajudar (cor de mostrador, ano específico, etc.)"
            maxChars={500}
          />
        </div>
      </div>
    </>
  );
}

// =====================================================
// STEP 3B — Descoberta
// =====================================================
function StepDescoberta({
  data,
  update,
  toggleArrayValue,
}: {
  data: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  toggleArrayValue: (key: keyof FormState, value: string) => void;
}) {
  return (
    <>
      <StepIntro
        eyebrow="Curadoria"
        title="Conte-nos sobre seu estilo"
        description="Selecione tudo que ressoa com você. Sem regras — quanto mais souberemos, melhor a curadoria."
      />

      <div className="space-y-9 stagger">
        <section>
          <FieldLabel>Estilo</FieldLabel>
          <div className="grid grid-cols-2 gap-3">
            {ESTILOS.map((e) => (
              <SelectCard
                key={e}
                selected={data.descobertaEstilo.includes(e)}
                onClick={() => toggleArrayValue("descobertaEstilo", e)}
                title={e}
              />
            ))}
          </div>
        </section>

        <section>
          <FieldLabel hint="múltiplas">Marcas de interesse</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {MARCAS.filter((m) => m !== "Outra").map((marca) => (
              <Chip
                key={marca}
                selected={data.descobertaMarcasInteresse.includes(marca)}
                onClick={() => toggleArrayValue("descobertaMarcasInteresse", marca)}
              >
                {marca}
              </Chip>
            ))}
          </div>
        </section>

        <section>
          <FieldLabel hint="múltiplas">Tipo de pulseira</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {TIPOS_PULSEIRA.map((p) => (
              <Chip
                key={p}
                selected={data.descobertaTipoPulseira.includes(p)}
                onClick={() => toggleArrayValue("descobertaTipoPulseira", p)}
              >
                {p}
              </Chip>
            ))}
          </div>
        </section>

        <section>
          <FieldLabel hint="múltiplas">Cor do mostrador</FieldLabel>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {CORES_MOSTRADOR.map((c) => (
              <ColorSwatch
                key={c.label}
                label={c.label}
                hex={c.hex}
                selected={data.descobertaCorMostrador.includes(c.label)}
                onClick={() => toggleArrayValue("descobertaCorMostrador", c.label)}
              />
            ))}
          </div>
        </section>

        <section>
          <FieldLabel htmlFor="tamPref">Tamanho de caixa preferido</FieldLabel>
          <LuxSelect
            id="tamPref"
            value={data.descobertaTamanhoCaixa}
            onChange={(v) => update("descobertaTamanhoCaixa", v)}
            options={TAMANHOS_CAIXA as unknown as string[]}
            placeholder="Selecione"
          />
        </section>

        <section>
          <FieldLabel htmlFor="faixa">Faixa de investimento</FieldLabel>
          <LuxSelect
            id="faixa"
            value={data.descobertaFaixaInvestimento}
            onChange={(v) => update("descobertaFaixaInvestimento", v)}
            options={FAIXAS_INVESTIMENTO as unknown as string[]}
            placeholder="Selecione"
          />
        </section>

        <section>
          <FieldLabel htmlFor="obsDesc" hint="opcional">
            Observações
          </FieldLabel>
          <LuxTextarea
            id="obsDesc"
            value={data.descobertaObservacoes}
            onChange={(e) => update("descobertaObservacoes", e.target.value)}
            placeholder="Conte qualquer detalhe que possa nos ajudar a entender seu gosto."
            maxChars={500}
          />
        </section>
      </div>
    </>
  );
}

// =====================================================
// STEP 4 — Confirmação
// =====================================================
function StepConfirmacao({
  data,
  setAceite,
  submitError,
}: {
  data: FormState;
  setAceite: (v: boolean) => void;
  submitError: string | null;
}) {
  const resumo = useMemo(() => buildResumo(data), [data]);

  return (
    <>
      <StepIntro
        eyebrow="Quase lá"
        title="Confira seus dados"
        description="Revise as informações antes de enviar. Se algo precisa ser ajustado, basta voltar."
      />

      <div className="bg-white border border-[#E5E2DD] rounded-sm p-6 sm:p-8 space-y-6 animate-watch-fade">
        {resumo.map((bloco) => (
          <div key={bloco.titulo}>
            <div className="text-[10px] tracking-[0.3em] uppercase text-[#B8960C] mb-3">
              {bloco.titulo}
            </div>
            <dl className="space-y-2">
              {bloco.itens.map((item) => (
                <div key={item.label} className="grid grid-cols-[140px_1fr] gap-3 text-sm">
                  <dt className="text-[#9A958C]">{item.label}</dt>
                  <dd className="text-[#1A1A1A]">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>

      <label className="mt-8 flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={data.aceiteComunicacao}
          onChange={(e) => setAceite(e.target.checked)}
          className="mt-1 w-4 h-4 accent-[#B8960C] cursor-pointer"
        />
        <span className="text-sm text-[#3D3A33] leading-relaxed group-hover:text-[#1A1A1A] transition-colors">
          Concordo em receber comunicações da Mr. Chrono via WhatsApp e e-mail.
        </span>
      </label>

      {submitError && (
        <div className="mt-6 p-4 border border-[#9B2C2C]/40 bg-[#9B2C2C]/5 rounded-sm">
          <p className="text-sm text-[#9B2C2C]">{submitError}</p>
        </div>
      )}
    </>
  );
}

// =====================================================
// SUCCESS SCREEN
// =====================================================
function SuccessScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16 text-center animate-watch-fade">
      <div className="mb-8 inline-flex items-center justify-center w-16 h-16 rounded-full border border-[#B8960C]">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 12l4 4 10-10"
            stroke="#B8960C"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="text-[10px] tracking-[0.4em] uppercase text-[#9A958C] mb-3">
        Mr. Chrono
      </div>

      <h1
        className="text-[2.25rem] sm:text-[2.75rem] leading-[1.1] text-[#1A1A1A] mb-6 max-w-xl"
        style={{ fontFamily: "var(--font-playfair), serif" }}
      >
        Recebemos seu Watch Fit.
      </h1>

      <p className="text-[15px] sm:text-base leading-relaxed text-[#5C5852] max-w-md mb-2">
        Nossa equipe já está analisando seu perfil. Em breve entraremos em contato com as
        melhores opções para você.
      </p>
      <p className="text-[15px] sm:text-base leading-relaxed text-[#5C5852] max-w-md mb-10">
        Enquanto isso, acompanhe nossas novidades no Instagram:{" "}
        <a
          href="https://instagram.com/mrchrono"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#B8960C] hover:underline underline-offset-4"
        >
          @mrchrono
        </a>
      </p>

      <a
        href={SITE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 min-h-12 px-7 rounded-sm
          text-sm font-medium tracking-[0.08em] uppercase
          bg-[#1A1A1A] text-[#F5F3EF] hover:bg-[#B8960C]
          transition-all duration-300"
      >
        Voltar ao site
      </a>
    </div>
  );
}

// =====================================================
// HELPERS
// =====================================================
// URL opcional: vazio é OK; preenchido precisa ser http(s) parseável
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
  // Mantém + no início se houver, depois só dígitos
  const hasPlus = value.trim().startsWith("+");
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (hasPlus) {
    // formato internacional simples: +XX X XXXX-XXXX (não impositivo)
    return `+${digits}`.slice(0, 16);
  }
  // formato BR: (11) 99999-9999
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

interface ResumoBloco {
  titulo: string;
  itens: { label: string; value: string }[];
}

function buildResumo(d: FormState): ResumoBloco[] {
  const blocos: ResumoBloco[] = [
    {
      titulo: "Dados pessoais",
      itens: [
        { label: "Nome", value: d.nome || "—" },
        { label: "E-mail", value: d.email || "—" },
        { label: "WhatsApp", value: d.whatsapp || "—" },
        ...(d.instagram ? [{ label: "Instagram", value: `@${d.instagram}` }] : []),
      ],
    },
  ];

  if (d.tipoBusca === "ESPECIFICO") {
    const marcaFinal = d.modeloMarca === "Outra" ? d.modeloMarcaOutra : d.modeloMarca;
    const condicaoLabel = CONDICOES.find((c) => c.value === d.modeloCondicao)?.label || "—";
    blocos.push({
      titulo: "Modelo procurado",
      itens: [
        { label: "Marca", value: marcaFinal || "—" },
        { label: "Modelo", value: d.modeloNome || "—" },
        ...(d.modeloTamanhoCaixa ? [{ label: "Tamanho", value: d.modeloTamanhoCaixa }] : []),
        ...(d.modeloReferencia ? [{ label: "Referência", value: d.modeloReferencia }] : []),
        { label: "Condição", value: condicaoLabel },
        ...(d.modeloLinkExemplo ? [{ label: "Link", value: d.modeloLinkExemplo }] : []),
        ...(d.modeloObservacoes ? [{ label: "Observações", value: d.modeloObservacoes }] : []),
      ],
    });
  }

  if (d.tipoBusca === "DESCOBERTA") {
    const itens: { label: string; value: string }[] = [];
    if (d.descobertaEstilo.length) itens.push({ label: "Estilo", value: d.descobertaEstilo.join(", ") });
    if (d.descobertaMarcasInteresse.length)
      itens.push({ label: "Marcas", value: d.descobertaMarcasInteresse.join(", ") });
    if (d.descobertaTipoPulseira.length)
      itens.push({ label: "Pulseira", value: d.descobertaTipoPulseira.join(", ") });
    if (d.descobertaCorMostrador.length)
      itens.push({ label: "Mostrador", value: d.descobertaCorMostrador.join(", ") });
    if (d.descobertaTamanhoCaixa) itens.push({ label: "Tamanho", value: d.descobertaTamanhoCaixa });
    if (d.descobertaFaixaInvestimento)
      itens.push({ label: "Investimento", value: d.descobertaFaixaInvestimento });
    if (d.descobertaObservacoes) itens.push({ label: "Observações", value: d.descobertaObservacoes });

    blocos.push({
      titulo: "Preferências",
      itens: itens.length > 0 ? itens : [{ label: "—", value: "Sem preferências informadas" }],
    });
  }

  return blocos;
}
