import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { SiteChrome } from "@/components/site/SiteChrome";

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
  icons: {
    icon: [{ url: "/favicon.ico", type: "image/x-icon", sizes: "any" }],
    shortcut: [{ url: "/favicon.ico", type: "image/x-icon" }],
    apple: [{ url: "/favicon.ico" }],
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
      "Análises técnicas, testes reais e recomendações para manicure, gel e equipamentos.",
    url: defaultSiteUrl,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${body.variable} min-h-screen`}>
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
