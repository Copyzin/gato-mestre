import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AgeGate } from "@/components/age-gate";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
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
    <html lang="pt-BR" className={`dark ${inter.variable}`}>
      <body className="min-h-screen bg-zinc-950 font-sans text-zinc-50 antialiased">
        {children}
        <AgeGate />
      </body>
    </html>
  );
}
