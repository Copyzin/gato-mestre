"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { icon: "⌂", label: "Início", href: "/" },
  { icon: "✦", label: "Dicas", href: "/#dicas" },
  { icon: "◷", label: "Resultados", href: "/resultados" },
  { icon: "◉", label: "Perfil", href: "/admin/login" },
];

/**
 * Bottom nav fixa (mobile, <1024px) — wireframe Figma Make.
 * "Perfil" leva à área restrita (única área de conta existente hoje).
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação inferior"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t-2 border-ink bg-papel pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 lg:hidden"
    >
      {ITEMS.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : item.href !== "/#dicas" && pathname.startsWith(item.href);
        return (
          <Link
            key={item.label}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "grid place-items-center gap-1 py-1 text-center",
              active ? "text-ink" : "text-cinza-1"
            )}
          >
            <span
              aria-hidden
              className={cn(
                "grid h-6 w-8 place-items-center text-base",
                active && "bg-amarelo"
              )}
            >
              {item.icon}
            </span>
            <span className="font-mono text-[8px] font-bold uppercase">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
