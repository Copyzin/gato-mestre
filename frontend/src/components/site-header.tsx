import Link from "next/link";
import { Cat } from "lucide-react";

export function SiteHeader() {
  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Sao_Paulo",
  });

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-bold tracking-tight"
        >
          <Cat aria-hidden className="h-5 w-5 text-green-500" />
          Gato Mestre
        </Link>
        <div className="flex items-center gap-4">
          <time className="hidden text-xs capitalize text-zinc-500 sm:block">
            {today}
          </time>
          <span className="rounded border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-bold text-amber-500">
            +18
          </span>
        </div>
      </div>
    </header>
  );
}
