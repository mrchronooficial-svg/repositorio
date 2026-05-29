import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mr. Chrono — Drop do Dia",
  description:
    "Condições especiais por tempo limitado. Relógios vintage selecionados a cada drop.",
  openGraph: {
    title: "Mr. Chrono — Drop do Dia",
    description:
      "Condições especiais por tempo limitado. Relógios vintage selecionados a cada drop.",
    type: "website",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Mr. Chrono",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a1628",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function DropLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${cormorant.variable} ${dmSans.variable} min-h-screen bg-[#0a1628] text-white`}
    >
      {children}
    </div>
  );
}
