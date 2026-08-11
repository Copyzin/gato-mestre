import type { TipWithMatch } from "@shared/index";

const confidenceLabel: Record<TipWithMatch["confidence"], string> = {
  high: "confiança alta",
  medium: "confiança média",
  low: "confiança baixa",
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
  /** Número de ordem da dica no feed (ex.: #01) */
  index?: number;
  /** Link de afiliado da casa parceira (banner hero) */
  betUrl?: string | null;
};

/**
 * Card de dica — layout do wireframe Figma Make (neo-brutalismo, tema claro):
 * liga, confronto, horário, caixa "dica clara" com odd e CTA.
 * Probabilidade % e badge "Dica paga" do wireframe não existem na API — omitidos.
 */
export function TipCard({ tip, index, betUrl }: Props) {
  const order = index !== undefined ? `#${String(index + 1).padStart(2, "0")}` : null;

  return (
    <article className="border-2 border-ink bg-papel transition hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#1e2722]">
      {/* Faixa superior (liga + número/resultado) — visível em telas menores que xl */}
      <div className="flex items-center justify-between border-b-2 border-ink px-4 py-2 font-mono text-[9px] font-bold uppercase xl:hidden">
        <span className="truncate">
          {tip.sport.name} · {tip.match.league}
        </span>
        {order && <span className="shrink-0">{order}</span>}
      </div>

      <div className="grid gap-5 p-4 sm:p-5 xl:grid-cols-[minmax(230px,1fr)_minmax(260px,.9fr)] xl:items-center">
        <div>
          <div className="hidden flex-wrap items-center gap-2 xl:flex">
            <p className="font-mono text-[10px] uppercase text-cinza-1">
              {tip.sport.name} · {tip.match.league}
            </p>
            <ResultPill result={tip.result} />
          </div>
          <h3 className="mt-1 text-xl font-black tracking-[-0.055em]">
            {tip.match.homeTeam} <span className="text-cinza-1">x</span>{" "}
            {tip.match.awayTeam}
          </h3>
          <p className="mt-1 font-mono text-[11px] font-bold">
            Hoje · {formatTime(tip.match.startTime)}
          </p>
          <div className="mt-2 xl:hidden">
            <ResultPill result={tip.result} />
          </div>
        </div>

        <div className="w-full border-2 border-ink bg-white p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[9px] font-bold uppercase text-cinza-1">
                Dica clara · {confidenceLabel[tip.confidence]}
              </p>
              <p className="mt-1 text-sm font-black">{tip.title}</p>
            </div>
            <span className="font-mono text-lg font-black tabular-nums">
              {tip.odds.toFixed(2)}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-ink pt-2">
            <span className="font-mono text-[10px] font-bold uppercase">
              Publicada pelo Gato Mestre
            </span>
            {betUrl && (
              <a
                href={betUrl}
                target="_blank"
                rel="noopener sponsored"
                className="shrink-0 border-2 border-ink bg-amarelo px-2 py-1 font-mono text-[9px] font-black uppercase"
              >
                Apostar →
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

/** Selo de resultado (Green/Red) — transparência quando o jogo já terminou. */
function ResultPill({ result }: { result: TipWithMatch["result"] }) {
  if (result === "won")
    return (
      <span className="border border-ink bg-menta px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase">
        ✓ Green
      </span>
    );
  if (result === "lost")
    return (
      <span className="border border-ink bg-perdida px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase">
        × Red
      </span>
    );
  if (result === "void")
    return (
      <span className="border border-ink bg-areia px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase">
        Anulada
      </span>
    );
  return null;
}
