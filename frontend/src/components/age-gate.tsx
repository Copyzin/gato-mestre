"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Cat, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "gm-age-verified-at";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Age gate 18+ — overlay client-side (o HTML da página continua servindo o
 * conteúdo para crawlers). Persiste a confirmação por 30 dias.
 * Só aparece nas páginas públicas — nunca no /admin.
 */
export function AgeGate() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isAdmin = pathname.startsWith("/admin");

  useEffect(() => {
    if (isAdmin) return;
    try {
      const verifiedAt = Number(localStorage.getItem(STORAGE_KEY));
      const valid = verifiedAt && Date.now() - verifiedAt < THIRTY_DAYS_MS;
      setOpen(!valid);
    } catch {
      setOpen(true);
    }
  }, [isAdmin]);

  if (isAdmin || !open) return null;

  function confirm() {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setOpen(false);
  }

  function leave() {
    window.location.href = "https://www.google.com";
  }

  // Focus trap simples: Tab circula entre os controles do diálogo
  function trapFocus(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Tab") return;
    const focusables = e.currentTarget.querySelectorAll<HTMLElement>(
      "button, [href], input, [tabindex]:not([tabindex='-1'])"
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
      onKeyDown={trapFocus}
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/95 p-4 shadow-2xl"
    >
      <div className="w-full max-w-sm rounded-lg border border-zinc-800 bg-zinc-900 p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-zinc-800">
          <Cat className="h-6 w-6 text-green-500" aria-hidden />
        </div>
        <h2 id="age-gate-title" className="text-lg font-semibold text-zinc-50">
          Você tem mais de 18 anos?
        </h2>
        <p className="mt-2 flex items-start justify-center gap-1.5 text-sm text-zinc-400">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
          Apostas envolvem risco. Aposte com responsabilidade.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={leave}>
            Não
          </Button>
          <Button onClick={confirm} autoFocus>
            Sim, tenho 18+
          </Button>
        </div>
        <p className="mt-4 text-xs text-zinc-500">
          Conteúdo destinado a maiores de 18 anos, conforme a legislação
          brasileira.
        </p>
      </div>
    </div>
  );
}
