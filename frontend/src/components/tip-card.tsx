import { ExternalLink } from "lucide-react";
import type { TipWithMatch } from "@shared/index";
import { cn } from "@/lib/utils";

const confidenceStyle: Record<TipWithMatch["confidence"], { dot: string; label: string }> = {
  high: { dot: "bg-green-500", label: "Confiança alta" },
  medium: { dot: "bg-amber-500", label: "Confiança média" },
  low: { dot: "bg-zinc-500", label: "Confiança baixa" },
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

type Props = {
  tip: TipWithMatch;
  /** Link de afiliado da casa parceira (banner hero) */
  betUrl?: string | null;
};

/**
 * Card de dica — só o essencial (regra do DESIGN.md):
 * esporte, liga, jogo, mercado, horário, confiança, odd e CTA.
 */
export function TipCard({ tip, betUrl }: Props) {
  const confidence = confidenceStyle[tip.confidence];

  return (
    <article className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between gap-3 text-xs text-zinc-500">
        <span className="flex min-w-0 items-center gap-1.5">
          <span aria-hidden>{tip.sport.icon ?? "•"}</span>
          <span className="truncate font-semibold uppercase tracking-wide">
            {tip.sport.name}
          </span>
          <span aria-hidden className="text-zinc-700">·</span>
          <span className="truncate">{tip.match.league}</span>
        </span>
        <time
          dateTime={tip.match.startTime}
          className="shrink-0 tabular-nums text-zinc-400"
        >
          {formatTime(tip.match.startTime)}
        </time>
      </div>

      <h3 className="mt-2.5 text-sm font-medium text-zinc-50">
        {tip.match.homeTeam} <span className="text-zinc-500">x</span> {tip.match.awayTeam}
      </h3>

      <div className="mt-1 flex items-center gap-2">
        <p className="min-w-0 text-sm font-semibold text-zinc-50">{tip.title}</p>
        <span className="flex shrink-0 items-center gap-1 whitespace-nowrap text-xs text-zinc-500">
          <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", confidence.dot)} />
          {confidence.label}
        </span>
        {tip.result === "won" && (
          <span className="rounded bg-green-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-green-500">
            Green
          </span>
        )}
        {tip.result === "lost" && (
          <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-500">
            Red
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs text-zinc-500">Odd</span>
          <span className="text-lg font-bold tabular-nums text-green-500">
            {tip.odds.toFixed(2)}
          </span>
        </div>
        {betUrl && (
          <a
            href={betUrl}
            target="_blank"
            rel="noopener sponsored"
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-green-500 px-3 text-xs font-semibold text-zinc-950 transition-colors duration-150 hover:bg-green-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-green-500"
          >
            Apostar
            <ExternalLink aria-hidden className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </article>
  );
}
