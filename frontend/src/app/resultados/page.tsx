import Link from "next/link";
import type { TipWithMatch } from "@shared/index";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SportsSidebar } from "@/components/sports-sidebar";
import { BottomNav } from "@/components/bottom-nav";

/**
 * Página /resultados — Central de resultados das dicas.
 *
 * CONTRATO ASSUMIDO COM O BACKEND (endpoint novo, implementado em paralelo):
 *   GET /tips/results → TipWithMatch[] (mesmo shape de /tips/today:
 *   tip + match + sport), com match.status = "finished" e tip.result ∈
 *   won/lost/void/pending, ordenado por match.startTime desc.
 * Enquanto o endpoint não existir (404) ou vier vazio, exibimos estado vazio
 * amigável — a página nunca quebra.
 */
export const dynamic = "force-dynamic";

const TZ = "America/Sao_Paulo";

type Filtro = "todos" | "ganhou" | "perdidas" | "semana";

const FILTROS: { key: Filtro; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "ganhou", label: "✓ Ganhou" },
  { key: "perdidas", label: "× Perdidas" },
  { key: "semana", label: "Semana" },
];

type Props = {
  searchParams: Promise<{ filtro?: string }>;
};

function formatDayTime(iso: string) {
  const date = new Date(iso);
  const time = date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });
  const dayKey = date.toLocaleDateString("pt-BR", { timeZone: TZ });
  const todayKey = new Date().toLocaleDateString("pt-BR", { timeZone: TZ });
  const yesterdayKey = new Date(Date.now() - 86400000).toLocaleDateString(
    "pt-BR",
    { timeZone: TZ }
  );
  if (dayKey === todayKey) return `Hoje · ${time}`;
  if (dayKey === yesterdayKey) return `Ontem · ${time}`;
  const day = date.toLocaleDateString("pt-BR", { day: "2-digit", timeZone: TZ });
  const month = date
    .toLocaleDateString("pt-BR", { month: "short", timeZone: TZ })
    .replace(".", "");
  return `${day} ${month} · ${time}`;
}

function lastUpdateLabel() {
  const now = new Date();
  const day = now.toLocaleDateString("pt-BR", { day: "2-digit", timeZone: TZ });
  const month = now
    .toLocaleDateString("pt-BR", { month: "short", timeZone: TZ })
    .replace(".", "");
  const time = now.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });
  return `${day} ${month} · ${time}`;
}

function applyFilter(tips: TipWithMatch[], filtro: Filtro) {
  if (filtro === "ganhou") return tips.filter((t) => t.result === "won");
  if (filtro === "perdidas") return tips.filter((t) => t.result === "lost");
  if (filtro === "semana") {
    const cutoff = Date.now() - 7 * 86400000;
    return tips.filter((t) => new Date(t.match.startTime).getTime() >= cutoff);
  }
  return tips;
}

export default async function ResultadosPage({ searchParams }: Props) {
  const { filtro: filtroParam } = await searchParams;
  const filtro: Filtro = FILTROS.some((f) => f.key === filtroParam)
    ? (filtroParam as Filtro)
    : "todos";

  const [sports, results] = await Promise.all([
    api.getSports(),
    api.getResults(),
  ]);

  const apiOffline = results === null;
  const filtered = applyFilter(results ?? [], filtro);

  return (
    <div className="min-h-screen bg-fundo text-ink">
      <div className="wire-noise" />
      <SiteHeader />

      <div className="relative z-10 pb-20 lg:grid lg:grid-cols-[245px_minmax(0,1fr)] lg:pb-0">
        <SportsSidebar sports={sports ?? []} activeNav="resultados" />

        <main className="min-w-0 p-4 sm:p-6 lg:p-8">
          {/* Hero */}
          <div className="border-2 border-ink bg-menta p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.15em]">
                  Central de resultados
                </p>
                <h1 className="mt-2 text-4xl font-black leading-none tracking-[-0.075em] sm:text-5xl">
                  Resultados
                  <br />
                  das dicas.
                </h1>
              </div>
              <div className="border-2 border-ink bg-papel p-3">
                <p className="font-mono text-[9px] font-bold uppercase">
                  Última atualização
                </p>
                <p className="mt-1 font-mono text-sm font-black uppercase">
                  {lastUpdateLabel()}
                </p>
              </div>
            </div>
            <p className="mt-5 max-w-xl text-sm leading-5">
              Acompanhe a resolução das análises publicadas pela equipe Gato
              Mestre, organizadas por esporte e competição.
            </p>
          </div>

          {/* Filtros */}
          <div className="scrollbar-none mt-6 flex gap-2 overflow-x-auto border-b-2 border-ink pb-3">
            {FILTROS.map((f) => (
              <Link
                key={f.key}
                href={f.key === "todos" ? "/resultados" : `/resultados?filtro=${f.key}`}
                aria-current={filtro === f.key ? "page" : undefined}
                className={cn(
                  "shrink-0 border-2 border-ink px-3 py-2 font-mono text-[10px] font-bold uppercase",
                  filtro === f.key ? "bg-ink text-white" : "bg-white"
                )}
              >
                {f.label}
              </Link>
            ))}
          </div>

          {/* Lista */}
          <div className="mt-6">
            <div className="mb-3 flex items-end justify-between">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-cinza-1">
                  {filtro === "todos"
                    ? "Todos os resultados"
                    : `Filtro · ${FILTROS.find((f) => f.key === filtro)?.label}`}
                </p>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.06em]">
                  Partidas encerradas
                </h2>
              </div>
              <span className="font-mono text-[10px] font-bold uppercase">
                {filtered.length} {filtered.length === 1 ? "registro" : "registros"}
              </span>
            </div>

            {apiOffline ? (
              <EmptyState message="A central de resultados ainda não está disponível. Volte em breve." />
            ) : filtered.length === 0 ? (
              <EmptyState
                message={
                  filtro === "todos"
                    ? "Nenhum resultado verificado até agora. As dicas encerradas aparecem aqui."
                    : "Nenhum resultado para este filtro."
                }
              />
            ) : (
              <div className="space-y-3">
                {filtered.map((tip) => (
                  <ResultCard key={tip.id} tip={tip} />
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 border-2 border-ink bg-areia p-4 text-center font-mono text-[10px] font-bold uppercase">
            Dados e resultados verificados pela equipe administradora.
          </div>
        </main>
      </div>

      <SiteFooter />
      <BottomNav />
    </div>
  );
}

function ResultCard({ tip }: { tip: TipWithMatch }) {
  return (
    <article className="border-2 border-ink bg-papel">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink px-4 py-2">
        <p className="font-mono text-[9px] font-bold uppercase text-cinza-1">
          {tip.sport.name} · {tip.match.league}
        </p>
        <time
          dateTime={tip.match.startTime}
          className="font-mono text-[10px] font-bold"
        >
          {formatDayTime(tip.match.startTime)}
        </time>
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-[minmax(220px,1fr)_minmax(190px,.8fr)_minmax(190px,.8fr)] sm:items-center">
        <div>
          <p className="text-base font-black">{tip.match.homeTeam}</p>
          <p className="mt-1 text-base font-black">{tip.match.awayTeam}</p>
        </div>
        <div className="border-l-0 border-cinza-3 sm:border-l-2 sm:pl-4">
          <p className="font-mono text-[9px] font-bold uppercase text-cinza-1">
            Dica publicada
          </p>
          <p className="mt-1 text-sm font-bold">{tip.title}</p>
          <p className="mt-1 font-mono text-xs tabular-nums">
            Odd {tip.odds.toFixed(2)}
          </p>
        </div>
        <ResultSeal result={tip.result} />
      </div>
    </article>
  );
}

function ResultSeal({ result }: { result: TipWithMatch["result"] }) {
  const config = {
    won: { bg: "bg-menta", label: "✓ Dica ganha" },
    lost: { bg: "bg-perdida", label: "× Dica perdida" },
    void: { bg: "bg-areia", label: "— Dica anulada" },
    pending: { bg: "bg-papel", label: "◷ Aguardando" },
  }[result];

  return (
    <div className={cn("border-2 border-ink px-3 py-3", config.bg)}>
      <p className="font-mono text-[9px] font-black uppercase">Resultado</p>
      <p className="mt-1 text-base font-black">{config.label}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="border-2 border-ink bg-papel p-8 text-center font-mono text-[11px] font-bold uppercase text-cinza-1">
      {message}
    </div>
  );
}
