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
  title: "Watch Fit — Mr. Chrono",
  description:
    "Curadoria personalizada de relógios. Conte-nos o que você procura e nossa equipe encontrará a peça certa para você.",
  openGraph: {
    title: "Watch Fit — Mr. Chrono",
    description:
      "Curadoria personalizada de relógios. Conte-nos o que você procura e nossa equipe encontrará a peça certa para você.",
    type: "website",
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#F5F3EF",
  width: "device-width",
  initialScale: 1,
};

export default function WatchFitLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${playfair.variable} ${dmSans.variable} watch-fit-root min-h-screen bg-[#F5F3EF] text-[#1A1A1A] antialiased`}
      style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}
    >
      {children}
    </div>
  );
}
