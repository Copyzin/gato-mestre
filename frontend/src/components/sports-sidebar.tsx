import Link from "next/link";
import type { Sport } from "@shared/index";
import { cn } from "@/lib/utils";

type NavKey = "inicio" | "dicas" | "resultados";

const NAV_ITEMS: { key: NavKey; icon: string; label: string; href: string }[] = [
  { key: "inicio", icon: "⌂", label: "Início", href: "/" },
  { key: "dicas", icon: "✦", label: "Dicas do dia", href: "/#dicas" },
  { key: "resultados", icon: "◷", label: "Resultados", href: "/resultados" },
];

type Props = {
  sports: Sport[];
  /** Slug do esporte ativo no filtro da home */
  activeSlug?: string;
  /** Item de navegação ativo (a página informa) */
  activeNav?: NavKey;
  /** Contagem de dicas de hoje por slug de esporte (opcional) */
  counts?: Record<string, number>;
};

/**
 * Sidebar desktop (245px, fundo areia): Navegação + Esportes + aviso de
 * jogo responsável — conforme wireframe Figma Make.
 */
export function SportsSidebar({ sports, activeSlug, activeNav, counts }: Props) {
  return (
    <aside className="hidden border-r-2 border-ink bg-areia lg:block">
      <div className="sticky top-0 flex max-h-screen flex-col overflow-y-auto p-4">
        <p className="mb-3 px-3 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-cinza-1">
          Navegação
        </p>
        <nav aria-label="Navegação principal" className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              aria-current={activeNav === item.key ? "page" : undefined}
              className={cn(
                "flex w-full items-center gap-3 border-2 px-3 py-3 text-left text-sm font-bold transition",
                activeNav === item.key
                  ? "border-ink bg-amarelo shadow-hard"
                  : "border-transparent hover:border-ink"
              )}
            >
              <span aria-hidden className="w-4 font-mono text-base">
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="my-7 border-t-2 border-dashed border-cinza-3" />

        <p className="mb-3 px-3 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-cinza-1">
          Esportes
        </p>
        <nav aria-label="Esportes" className="space-y-1">
          <SportLink
            href="/"
            label="Todos"
            active={activeNav !== "resultados" && !activeSlug}
          />
          {sports.map((sport) => (
            <SportLink
              key={sport.id}
              href={`/?esporte=${sport.slug}`}
              icon={sport.icon}
              label={sport.name}
              count={counts?.[sport.slug]}
              active={activeSlug === sport.slug}
            />
          ))}
        </nav>

        <div className="mt-7 border-2 border-ink bg-white p-3">
          <p className="font-mono text-[10px] font-bold uppercase">
            Jogo responsável
          </p>
          <p className="mt-1 text-xs leading-4">
            Aposte apenas o que cabe no seu orçamento. +18
          </p>
        </div>
      </div>
    </aside>
  );
}

function SportLink({
  href,
  icon,
  label,
  count,
  active,
}: {
  href: string;
  icon?: string | null;
  label: string;
  count?: number;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex w-full items-center justify-between px-3 py-2.5 text-left text-sm",
        active ? "bg-white font-bold" : "hover:bg-white"
      )}
    >
      <span className="flex items-center gap-3">
        <span aria-hidden>{icon ?? "•"}</span>
        {label}
      </span>
      {count !== undefined && (
        <span className="font-mono text-[10px] tabular-nums text-cinza-1">
          {count}
        </span>
      )}
    </Link>
  );
}
