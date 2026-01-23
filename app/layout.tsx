import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";
import { SiteChrome } from "@/components/site/SiteChrome";

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
  title: "Estética da Verdade — Unhas",
  description: "Guias, reviews e recomendações sobre unhas e manicure (equipamentos, géis, kits e decoração).",
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${body.variable} ${display.variable} min-h-screen`}>
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
