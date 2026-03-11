export function DropEmpty() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1628] to-[#121a2e] flex flex-col items-center justify-center px-6"
      style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}>
      <div className="mb-6">
        <div className="w-16 h-16 rounded-full bg-white/[0.05] flex items-center justify-center">
          <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
      </div>
      <h2 className="text-white/60 text-lg font-semibold mb-2"
        style={{ fontFamily: "var(--font-cormorant), serif" }}>
        Nenhum drop agendado
      </h2>
      <p className="text-white/30 text-sm text-center max-w-xs">
        Fique de olho nas nossas redes para novidades!
      </p>
    </div>
  );
}
