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

const defaultSiteUrl = process.env.SITE_URL ?? "https://lindisse.com.br";

export const metadata: Metadata = {
  title: {
    default: "Lindisse | Guia definitivo para nail designers",
    template: "%s | Lindisse",
  },
  description:
    "Guias, reviews e comparativos para nail designers comprarem melhor, com metodologia transparente e foco em E-E-A-T.",
  metadataBase: new URL(defaultSiteUrl),
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Lindisse",
    title: "Lindisse | Guia definitivo para nail designers",
    description:
      "Analises tecnicas, testes reais e recomendacoes para manicure, gel e equipamentos.",
    url: defaultSiteUrl,
  },
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
