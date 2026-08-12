import type { Metadata } from "next";
import { DM_Mono, IBM_Plex_Sans } from "next/font/google";
import { AgeGate } from "@/components/age-gate";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Gato Mestre — Dicas de Apostas",
  description:
    "Dicas de apostas esportivas do dia: futebol, basquete, tênis e mais. Análise objetiva, odd e nível de confiança. Conteúdo para maiores de 18 anos.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${plexSans.variable} ${dmMono.variable}`}>
      <body className="min-h-screen bg-fundo font-sans text-ink antialiased">
        {children}
        <AgeGate />
        {process.env.NODE_ENV === "development" && (
          <script type="module" src="http://localhost:7331/inject.js" async />
        )}
      </body>
    </html>
  );
}
