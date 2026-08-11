// Provider de futebol sobre a Odds-API.io: calendário (events), sugestões de
// dica (probabilidade implícita das odds → draft) e apuração automática
// (placar final → green/red). Agnóstico a esporte por desenho — outros
// esportes entram como providers irmãos reutilizando as mesmas tarefas.
//
// NOTA HISTÓRICA: a espinha dorsal seria a API-Sports, mas o plano grátis
// dela só libera temporadas 2022–2024 (sem dados atuais). A API-Sports fica
// para backtesting histórico futuro; o loop ao vivo é 100% Odds-API.io.

import { and, eq, gte, isNotNull, lt, ne } from "drizzle-orm";
import type { Db } from "../db";
import { matches, sports, tips } from "../db/schema";
import {
  fetchEvents,
  fetchEventOdds,
  SELECTED_BOOKMAKERS,
  type FetchImpl,
  type OddsApiEvent,
  type OddsApiMarket,
} from "./odds-api-io";

// ─── Ligas cobertas no MVP (filtro por trecho do nome, minúsculo) ────────────

const LEAGUE_ALLOWLIST = [
  "brazil", // Série A/B, Copa do Brasil, estaduais
  "conmebol", // Libertadores, Sudamericana
  "champions league",
  "premier league", // Inglaterra
  "la liga", // Espanha
  "bundesliga",
  "serie a", // Itália (e reforça Brazil - Serie A)
  "ligue 1",
];

function leagueAllowed(name: string): boolean {
  const n = name.toLowerCase();
  return LEAGUE_ALLOWLIST.some((fragment) => n.includes(fragment));
}

// ─── Status da Odds-API.io → nosso enum ──────────────────────────────────────

type MatchStatus = "scheduled" | "live" | "finished";

export function mapEventStatus(apiStatus: string): MatchStatus | "cancelled" {
  switch (apiStatus) {
    case "settled":
      return "finished";
    case "live":
    case "in_play":
      return "live";
    case "cancelled":
    case "abandoned":
      return "cancelled";
    default:
      return "scheduled"; // "pending", "postponed"…
  }
}

// ─── Probabilidade implícita das odds ────────────────────────────────────────

/**
 * Converte odds em probabilidades "justas" (sem a margem da casa):
 * prob_i = (1/odd_i) / Σ(1/odd_j). Retorna percentuais inteiros (0–100).
 */
export function impliedProbabilities<T extends string>(odds: Record<T, number>): Record<T, number> {
  const entries = Object.entries(odds) as [T, number][];
  const total = entries.reduce((sum, [, odd]) => sum + 1 / odd, 0);
  return Object.fromEntries(
    entries.map(([key, odd]) => [key, Math.round((100 / odd / total))])
  ) as Record<T, number>;
}

// ─── Regras de apuração por mercado (inalteradas) ────────────────────────────

type TipMarket =
  | "home_win"
  | "draw"
  | "away_win"
  | "over_25"
  | "under_25"
  | "btts_yes"
  | "btts_no";

export function settleByScore(
  market: TipMarket,
  homeScore: number,
  awayScore: number
): "won" | "lost" {
  const total = homeScore + awayScore;
  switch (market) {
    case "home_win":
      return homeScore > awayScore ? "won" : "lost";
    case "away_win":
      return awayScore > homeScore ? "won" : "lost";
    case "draw":
      return homeScore === awayScore ? "won" : "lost";
    case "over_25":
      return total >= 3 ? "won" : "lost";
    case "under_25":
      return total <= 2 ? "won" : "lost";
    case "btts_yes":
      return homeScore > 0 && awayScore > 0 ? "won" : "lost";
    case "btts_no":
      return homeScore === 0 || awayScore === 0 ? "won" : "lost";
  }
}

// ─── Sugestões a partir das odds (funções puras) ─────────────────────────────

const MIN_PROBABILITY = 55; // corte mínimo para virar sugestão

type DraftSuggestion = {
  market: TipMarket;
  title: string;
  probability: number;
  confidence: "low" | "medium" | "high";
  odd: number;
};

function marketOdds(markets: OddsApiMarket[], name: string): Record<string, string | number>[] {
  const n = name.toLowerCase();
  const found = markets.find(
    (m) => m.name.toLowerCase() === n || (n === "btts" && m.name.toLowerCase().includes("both teams"))
  );
  return found?.odds ?? [];
}

const num = (v: string | number | undefined): number | null => {
  const n = Number(v);
  return Number.isFinite(n) && n > 1 ? n : null;
};

/** Deriva sugestões dos mercados de UM bookmaker. Máx. 1 por mercado. */
export function suggestionsFromOdds(
  markets: OddsApiMarket[],
  homeTeam: string,
  awayTeam: string
): DraftSuggestion[] {
  const out: DraftSuggestion[] = [];
  const push = (market: TipMarket, title: string, probability: number, odd: number | null) => {
    if (odd === null || probability < MIN_PROBABILITY) return;
    out.push({
      market,
      title,
      probability,
      confidence: probability >= 65 ? "high" : "medium",
      odd,
    });
  };

  // 1X2 (ML)
  const ml = marketOdds(markets, "ML")[0];
  if (ml) {
    const odds = { home_win: num(ml.home), draw: num(ml.draw), away_win: num(ml.away) };
    if (odds.home_win && odds.draw && odds.away_win) {
      const probs = impliedProbabilities({
        home_win: odds.home_win,
        draw: odds.draw,
        away_win: odds.away_win,
      });
      const titles: Record<string, string> = {
        home_win: `${homeTeam} vence`,
        draw: "Empate",
        away_win: `${awayTeam} vence`,
      };
      for (const market of ["home_win", "draw", "away_win"] as const) {
        push(market, titles[market], probs[market], odds[market]);
      }
    }
  }

  // Over/Under 2.5 (Totals, linha hdp = 2.5)
  const totals = marketOdds(markets, "Totals");
  const line25 = totals.find((o) => Number(o.hdp) === 2.5);
  if (line25) {
    const over = num(line25.over);
    const under = num(line25.under);
    if (over && under) {
      const probs = impliedProbabilities({ over_25: over, under_25: under });
      push("over_25", "Mais de 2.5 gols", probs.over_25, over);
      push("under_25", "Menos de 2.5 gols", probs.under_25, under);
    }
  }

  // Ambas marcam (BTTS)
  const btts = marketOdds(markets, "btts")[0];
  if (btts) {
    const yes = num(btts.yes);
    const no = num(btts.no);
    if (yes && no) {
      const probs = impliedProbabilities({ btts_yes: yes, btts_no: no });
      push("btts_yes", "Ambas marcam", probs.btts_yes, yes);
      push("btts_no", "Ambas NÃO marcam", probs.btts_no, no);
    }
  }

  // No máximo 1 sugestão por mercado — a de maior probabilidade já foi
  // filtrada acima; se duas pontas do mesmo mercado passarem do corte
  // (improvável), fica só a mais provável.
  const byMarket = new Map<TipMarket, DraftSuggestion>();
  for (const sug of out) {
    const prev = byMarket.get(sug.market);
    if (!prev || sug.probability > prev.probability) byMarket.set(sug.market, sug);
  }
  return [...byMarket.values()];
}

// ─── Tarefa 1: calendário (events → matches) ─────────────────────────────────

export async function ingestFixtures(
  db: Db,
  fetchImpl: FetchImpl,
  apiKey: string,
  from: Date,
  to: Date
): Promise<{ upserted: number }> {
  const [futebol] = await db.select().from(sports).where(eq(sports.slug, "futebol"));
  if (!futebol) throw new Error("Esporte 'futebol' não cadastrado — rode o seed.");

  const events = await fetchEvents(fetchImpl, apiKey, from, to);
  let upserted = 0;

  for (const ev of events) {
    if (!leagueAllowed(ev.league.name)) continue;
    const status = mapEventStatus(ev.status);
    await db
      .insert(matches)
      .values({
        sportId: futebol.id,
        league: ev.league.name,
        homeTeam: ev.home,
        awayTeam: ev.away,
        startTime: new Date(ev.date),
        status: status === "cancelled" ? "scheduled" : status,
        externalId: `oddsapiio:${ev.id}`,
        homeScore: ev.scores?.home ?? null,
        awayScore: ev.scores?.away ?? null,
      })
      .onConflictDoUpdate({
        target: matches.externalId,
        set: {
          league: ev.league.name,
          homeTeam: ev.home,
          awayTeam: ev.away,
          startTime: new Date(ev.date),
          ...(status !== "cancelled" ? { status } : {}),
          homeScore: ev.scores?.home ?? null,
          awayScore: ev.scores?.away ?? null,
        },
      });
    upserted++;
  }
  return { upserted };
}

// ─── Tarefa 2: sugestões (odds → dicas draft com probabilidade) ──────────────

const MAX_ODDS_CALLS_PER_RUN = 40; // guarda de cota (100 req/hora)

export async function ingestSuggestions(
  db: Db,
  fetchImpl: FetchImpl,
  apiKey: string
): Promise<{ suggested: number }> {
  const now = new Date();
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const endOfTomorrow = new Date(startOfDay.getTime() + 48 * 60 * 60 * 1000);

  const upcoming = await db
    .select()
    .from(matches)
    .where(
      and(
        isNotNull(matches.externalId),
        ne(matches.status, "finished"),
        gte(matches.startTime, startOfDay),
        lt(matches.startTime, endOfTomorrow)
      )
    )
    .limit(MAX_ODDS_CALLS_PER_RUN);

  let suggested = 0;
  for (const match of upcoming) {
    const eventId = Number(match.externalId!.replace("oddsapiio:", ""));
    const data = await fetchEventOdds(fetchImpl, apiKey, eventId);
    if (!data) continue;

    // Usa o primeiro bookmaker que tiver mercados (1xbet, depois 22Bet)
    for (const book of SELECTED_BOOKMAKERS) {
      const markets = data.bookmakers?.[book];
      if (!markets || markets.length === 0) continue;

      for (const sug of suggestionsFromOdds(markets, match.homeTeam, match.awayTeam)) {
        // Idempotência: já existe dica (draft ou publicada) deste mercado neste jogo
        const existing = await db
          .select({ id: tips.id })
          .from(tips)
          .where(and(eq(tips.matchId, match.id), eq(tips.market, sug.market)))
          .limit(1);
        if (existing.length > 0) continue;

        await db.insert(tips).values({
          matchId: match.id,
          title: sug.title,
          market: sug.market,
          probability: sug.probability,
          confidence: sug.confidence,
          odds: String(sug.odd), // odd real do bookmaker; admin ajusta se quiser
          status: "draft",
        });
        suggested++;
      }
      break; // um bookmaker por jogo basta
    }
  }
  return { suggested };
}

// ─── Tarefa 3: apuração (placar final → green/red) ───────────────────────────

export async function settleTips(
  db: Db,
  fetchImpl: FetchImpl,
  apiKey: string
): Promise<{ settled: number }> {
  const pending = await db
    .select({ tip: tips, match: matches })
    .from(tips)
    .innerJoin(matches, eq(tips.matchId, matches.id))
    .where(
      and(
        eq(tips.status, "published"),
        eq(tips.result, "pending"),
        isNotNull(tips.market),
        isNotNull(matches.externalId),
        ne(matches.status, "finished")
      )
    );

  if (pending.length === 0) return { settled: 0 };

  // Uma chamada só: eventos dos últimos 3 dias, indexados por id
  const from = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const events = await fetchEvents(fetchImpl, apiKey, from, new Date());
  const byId = new Map<number, OddsApiEvent>(events.map((ev) => [ev.id, ev]));

  let settled = 0;
  const processedMatches = new Set<number>();

  for (const { tip, match } of pending) {
    const eventId = Number(match.externalId!.replace("oddsapiio:", ""));
    const ev = byId.get(eventId);
    if (!ev) continue;

    const status = mapEventStatus(ev.status);

    if (status === "finished" && ev.scores?.home != null && ev.scores?.away != null) {
      if (!processedMatches.has(match.id)) {
        await db
          .update(matches)
          .set({ status: "finished", homeScore: ev.scores.home, awayScore: ev.scores.away })
          .where(eq(matches.id, match.id));
        processedMatches.add(match.id);
      }
      await db
        .update(tips)
        .set({
          result: settleByScore(tip.market as TipMarket, ev.scores.home, ev.scores.away),
          settledBy: "auto",
        })
        .where(eq(tips.id, tip.id));
      settled++;
    } else if (status === "cancelled") {
      if (!processedMatches.has(match.id)) {
        await db.update(matches).set({ status: "finished" }).where(eq(matches.id, match.id));
        processedMatches.add(match.id);
      }
      await db
        .update(tips)
        .set({ result: "void", settledBy: "auto" })
        .where(eq(tips.id, tip.id));
      settled++;
    } else if (status === "live" && match.status !== "live") {
      await db.update(matches).set({ status: "live" }).where(eq(matches.id, match.id));
    }
  }
  return { settled };
}
