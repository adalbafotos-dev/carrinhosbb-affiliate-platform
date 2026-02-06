import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";
import { SiteChrome } from "@/components/site/SiteChrome";
import { getPublicSilos } from "@/lib/db";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});

const body = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Estética da Verdade",
  description: "CMS neutro para silos, pilares e posts otimizados.",
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const silos = await getPublicSilos();
  return (
    <html lang="pt-BR">
      <body className={`${body.variable} ${display.variable} min-h-screen`}>
        <SiteChrome silos={silos}>{children}</SiteChrome>
      </body>
    </html>
  );
}
