import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Sport } from "@shared/index";
import { cn } from "@/lib/utils";

type Props = {
  sports: Sport[];
  activeSlug?: string;
};

/**
 * Sidebar de esportes (desktop). Item ativo = hairline lateral verde,
 * sem preenchimento (regra do DESIGN.md).
 */
export function SportsSidebar({ sports, activeSlug }: Props) {
  return (
    <nav aria-label="Esportes" className="hidden w-60 shrink-0 lg:block">
      <div className="sticky top-14 max-h-[calc(100vh-3.5rem)] overflow-y-auto border-r border-zinc-800 py-3 pr-3">
        <SidebarLink
          href="/"
          label="Todos"
          active={!activeSlug}
        />
        {sports.map((sport) => (
          <SidebarLink
            key={sport.id}
            href={`/?esporte=${sport.slug}`}
            icon={sport.icon}
            label={sport.name}
            active={activeSlug === sport.slug}
          />
        ))}
      </div>
    </nav>
  );
}

function SidebarLink({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon?: string | null;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-2.5 border-l-2 py-2 pl-3 pr-2 text-xs font-semibold uppercase tracking-wide transition-colors duration-150",
        active
          ? "border-green-500 text-zinc-50"
          : "border-transparent text-zinc-400 hover:text-zinc-50"
      )}
    >
      <span aria-hidden className="w-5 text-center text-sm">
        {icon ?? "•"}
      </span>
      <span className="flex-1 truncate">{label}</span>
      <ChevronRight
        aria-hidden
        className="h-3.5 w-3.5 text-zinc-600 transition-colors group-hover:text-zinc-400"
      />
    </Link>
  );
}
