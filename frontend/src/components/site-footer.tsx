import { ShieldAlert } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-zinc-800">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-8 text-center">
        <p className="flex items-center gap-2 text-sm font-semibold text-amber-500">
          <ShieldAlert aria-hidden className="h-4 w-4" />
          Proibido para menores de 18 anos
        </p>
        <p className="max-w-lg text-xs leading-relaxed text-zinc-500">
          Apostas envolvem risco financeiro. Jogue com responsabilidade. O Gato
          Mestre oferece conteúdo informativo e não garante resultados. Se o
          jogo deixou de ser diversão, procure ajuda.
        </p>
        <p className="text-xs text-zinc-500">
          © {new Date().getFullYear()} Gato Mestre
        </p>
      </div>
    </footer>
  );
}
