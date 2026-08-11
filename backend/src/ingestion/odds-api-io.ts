// Cliente HTTP da Odds-API.io — fronteira externa do sistema e ESPINHA DORSAL
// dos dados ao vivo (calendário, odds, placares). 100 req/hora no plano grátis.
// Fetch injetável: produção usa o global; testes recebem um stub.

export type FetchImpl = (
  input: string | URL,
  init?: RequestInit
) => Promise<Response>;

const BASE = "https://api.odds-api.io/v3";

// Casas selecionadas na conta do plano grátis (máx. 2 — trocáveis no dashboard).
// 1xbet e 22Bet operam no Brasil. Se a seleção mudar, atualizar aqui.
export const SELECTED_BOOKMAKERS = ["1xbet", "22Bet"];

// ─── Tipos das respostas (só os campos que usamos) ───────────────────────────

export interface OddsApiEvent {
  id: number;
  home: string;
  away: string;
  date: string; // RFC3339
  league: { name: string; slug: string };
  // "pending" = não começou; "settled" = encerrado com placar; "live" = rolando
  status: string;
  scores?: { home: number | null; away: number | null } | null;
}

export interface OddsApiMarket {
  name: string; // "ML", "Totals", "Both Teams To Score", "Spread"…
  odds: Record<string, string | number>[];
}

export interface OddsApiEventOdds {
  id: number;
  bookmakers: Record<string, OddsApiMarket[]>;
}

async function apiGet<T>(fetchImpl: FetchImpl, path: string, apiKey: string): Promise<T> {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetchImpl(`${BASE}${path}${sep}apiKey=${apiKey}`);
  if (!res.ok) throw new Error(`Odds-API.io ${path} → HTTP ${res.status}`);
  const json = (await res.json()) as T & { error?: string };
  if (!Array.isArray(json) && typeof json === "object" && json && "error" in json && json.error) {
    throw new Error(`Odds-API.io ${path} → ${json.error}`);
  }
  return json;
}

/** Eventos de futebol num intervalo (datas em RFC3339). 1 requisição por chamada. */
export function fetchEvents(
  fetchImpl: FetchImpl,
  apiKey: string,
  from: Date,
  to: Date,
  limit = 300
): Promise<OddsApiEvent[]> {
  const qs = new URLSearchParams({
    sport: "football",
    from: from.toISOString(),
    to: to.toISOString(),
    limit: String(limit),
  });
  return apiGet<OddsApiEvent[]>(fetchImpl, `/events?${qs}`, apiKey);
}

/** Odds de um evento nas casas selecionadas da conta. 1 requisição por evento. */
export async function fetchEventOdds(
  fetchImpl: FetchImpl,
  apiKey: string,
  eventId: number
): Promise<OddsApiEventOdds | null> {
  const qs = new URLSearchParams({
    eventId: String(eventId),
    bookmakers: SELECTED_BOOKMAKERS.join(","),
  });
  const data = await apiGet<OddsApiEventOdds>(fetchImpl, `/odds?${qs}`, apiKey);
  return data && data.id ? data : null;
}
