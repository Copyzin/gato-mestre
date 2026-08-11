"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "gm-age-verified-at";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Age gate 18+ — overlay client-side (o HTML da página continua servindo o
 * conteúdo para crawlers). Persiste a confirmação por 30 dias.
 * Só aparece nas páginas públicas — nunca no /admin.
 * Visual: wireframe Figma Make (neo-brutalismo, sombra dura amarela).
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
      className="fixed inset-0 z-50 grid place-items-center bg-ink/70 p-5"
    >
      <div className="w-full max-w-md border-2 border-ink bg-papel p-6 shadow-hard-amarelo">
        <span className="grid h-11 w-11 place-items-center rounded-full border-2 border-ink bg-amarelo font-mono text-sm font-black">
          18+
        </span>
        <p className="mt-5 font-mono text-[10px] font-black uppercase tracking-[0.15em]">
          Aviso importante
        </p>
        <h2
          id="age-gate-title"
          className="mt-2 text-3xl font-black tracking-[-0.06em]"
        >
          Você tem mais de 18 anos?
        </h2>
        <p className="mt-3 text-sm leading-6">
          O Gato Mestre oferece conteúdo editorial sobre apostas esportivas.
          Aposte com responsabilidade.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={confirm}
            autoFocus
            className="border-2 border-ink bg-amarelo py-3 font-mono text-[11px] font-black uppercase"
          >
            Sim, continuar
          </button>
          <button
            onClick={leave}
            className="border-2 border-ink bg-white py-3 font-mono text-[11px] font-black uppercase"
          >
            Não
          </button>
        </div>
        <p className="mt-4 font-mono text-[9px] uppercase text-cinza-1">
          Conteúdo destinado a maiores de 18 anos, conforme a legislação
          brasileira.
        </p>
      </div>
    </div>
  );
}
