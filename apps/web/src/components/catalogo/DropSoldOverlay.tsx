export function DropSoldOverlay() {
  return (
    <div className="absolute inset-0 z-10 bg-[#0a1628]/50 flex items-center justify-center pointer-events-none">
      <span
        className="bg-red-600 text-white text-sm font-bold tracking-wider uppercase px-4 py-2 rounded-lg"
        style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
      >
        Vendido
      </span>
    </div>
  );
}
