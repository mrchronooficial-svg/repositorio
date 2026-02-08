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
  title: "Mr. Chrono — Catálogo",
  description:
    "Relógios vintage selecionados com curadoria. Peças únicas com garantia Mr. Chrono.",
  openGraph: {
    title: "Mr. Chrono — Catálogo",
    description:
      "Relógios vintage selecionados com curadoria. Peças únicas com garantia Mr. Chrono.",
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

export default function CatalogoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${cormorant.variable} ${dmSans.variable} min-h-screen bg-white text-[#0a1628]`}
    >
      {children}
    </div>
  );
}
