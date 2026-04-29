import type { Metadata, Viewport } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-playfair",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Comunidade VIP — Mr. Chrono",
  description:
    "Um círculo exclusivo para colecionadores e entusiastas que buscam mais do que relógios — buscam experiências, conexões e acesso privilegiado ao melhor da alta relojoaria.",
  openGraph: {
    title: "Comunidade VIP — Mr. Chrono",
    description:
      "Um círculo exclusivo para colecionadores. Acesso privilegiado, networking e curadoria do melhor da alta relojoaria.",
    type: "website",
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
  width: "device-width",
  initialScale: 1,
};

export default function ComunidadeVipLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${playfair.variable} ${dmSans.variable} comunidade-vip-root min-h-screen bg-[#0A0A0A] text-[#F5F3EF] antialiased`}
      style={{
        fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
        colorScheme: "dark",
      }}
    >
      {children}
    </div>
  );
}
