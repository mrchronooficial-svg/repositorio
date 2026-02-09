"use client";

// Force dynamic rendering to avoid prerender crash (Next.js 16 bug)
// See: https://github.com/vercel/next.js/issues/85668
export const dynamic = "force-dynamic";

export default function GlobalError() {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        <div style={{ padding: "40px", textAlign: "center" }}>
          <h2>Algo deu errado!</h2>
          <p>Ocorreu um erro inesperado.</p>
          <a href="/" style={{ color: "#2563eb" }}>
            Voltar ao inicio
          </a>
        </div>
      </body>
    </html>
  );
}
