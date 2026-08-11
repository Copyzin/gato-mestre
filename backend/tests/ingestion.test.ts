import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import type { Db } from "../src/db";
import { matches, sports, tips } from "../src/db/schema";
import type { FetchImpl } from "../src/ingestion/odds-api-io";
import {
  asJson,
  createApi,
  createTestDb,
  resetDb,
  seedAdmin,
  seedSports,
  type TestApp,
} from "./helpers";

// ─── Stub da fronteira externa (Odds-API.io) ─────────────────────────────────
// Respostas enlatadas por padrão de URL; o padrão é "sem dados" ([]).

let stubRoutes: Record<string, unknown> = {};

const stubFetch: FetchImpl = async (input) => {
  const url = String(input);
  for (const [pattern, body] of Object.entries(stubRoutes)) {
    if (url.includes(pattern)) {
      return new Response(JSON.stringify(body), { status: 200 });
    }
  }
  return new Response(JSON.stringify([]), { status: 200 });
};

const EVENTO_FUTURO = {
  id: 5001,
  home: "Time A FC",
  away: "Time B",
  date: "", // preenchido por teste
  league: { name: "Brazil - Serie A", slug: "brazil-serie-a" },
  status: "pending",
  scores: null,
};

// Odds com favorito claro — probabilidades implícitas calculadas à mão:
// ML 1.40/4.50/8.00 → 67/22/12 (home_win 67%, high)
// Totals 2.5: over 1.50 / under 2.60 → over 63% (medium)
// BTTS: yes 1.60 / no 2.30 → yes 59% (medium)
const ODDS_5001 = {
  id: 5001,
  bookmakers: {
    "1xbet": [
      { name: "ML", odds: [{ home: "1.40", draw: "4.50", away: "8.00" }] },
      { name: "Totals", odds: [{ hdp: 2.5, over: "1.50", under: "2.60" }] },
      { name: "Both Teams To Score", odds: [{ yes: "1.60", no: "2.30" }] },
    ],
  },
};

// ─── Setup ───────────────────────────────────────────────────────────────────

let db: Db;
let app: TestApp;
let api: ReturnType<typeof createApi>;

beforeAll(async () => {
  db = await createTestDb();
  app = (await import("../src/app")).buildApp({ db, fetchImpl: stubFetch });
  api = createApi(app);
});

beforeEach(async () => {
  stubRoutes = {};
  await resetDb(db);
  await seedSports(db);
});

async function login() {
  await seedAdmin(db, "senha-certa");
  // IP único por login: o rate limiter limita 5 tentativas/5min por IP
  const ip = `10.9.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}`;
  const res = await api("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", "cf-connecting-ip": ip },
    body: JSON.stringify({ email: "admin@teste.local", password: "senha-certa" }),
  });
  const body = await asJson(res);
  return { "Content-Type": "application/json", Authorization: `Bearer ${body.token}` };
}

function hojeAs(horasUtc: number): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), horasUtc)
  ).toISOString();
}

async function seedMatchFromApi(startTime: string) {
  const [futebol] = await db.select().from(sports).where(eq(sports.slug, "futebol"));
  const [match] = await db
    .insert(matches)
    .values({
      sportId: futebol.id,
      league: "Brazil - Serie A",
      homeTeam: "Time A FC",
      awayTeam: "Time B",
      startTime: new Date(startTime),
      status: "scheduled",
      externalId: "oddsapiio:5001",
    })
    .returning();
  return match;
}

// ─── Tarefa: fixtures (calendário) ───────────────────────────────────────────

describe("POST /admin/ingest — fixtures", () => {
  it("ingere jogos das ligas cobertas, ignora as demais e não duplica", async () => {
    stubRoutes["/events?sport=football"] = [
      { ...EVENTO_FUTURO, date: hojeAs(22) },
      {
        ...EVENTO_FUTURO,
        id: 9999,
        date: hojeAs(20),
        league: { name: "Paraguay - Division de Honor", slug: "paraguay" },
      },
    ];

    const headers = await login();
    const res = await api("/admin/ingest", {
      method: "POST",
      headers,
      body: JSON.stringify({ task: "fixtures" }),
    });
    expect(res.status).toBe(200);

    let rows = await db.select().from(matches);
    expect(rows).toHaveLength(1); // Paraguai ficou de fora
    expect(rows[0]).toMatchObject({
      league: "Brazil - Serie A",
      homeTeam: "Time A FC",
      status: "scheduled",
      externalId: "oddsapiio:5001",
    });

    await api("/admin/ingest", { method: "POST", headers, body: JSON.stringify({ task: "fixtures" }) });
    rows = await db.select().from(matches);
    expect(rows).toHaveLength(1); // upsert pelo externalId
  });
});

// ─── Tarefa: suggestions (odds → drafts com probabilidade) ───────────────────

describe("POST /admin/ingest — suggestions", () => {
  it("gera sugestões com probabilidade implícita e odd real, escondidas do site", async () => {
    await seedMatchFromApi(hojeAs(22));
    stubRoutes["/odds?eventId=5001"] = ODDS_5001;

    const headers = await login();
    const res = await api("/admin/ingest", {
      method: "POST",
      headers,
      body: JSON.stringify({ task: "suggestions" }),
    });
    expect(res.status).toBe(200);

    const drafts = await asJson(await api("/admin/tips?status=draft", { headers }));
    const markets = drafts.map((d: { market: string }) => d.market).sort();
    expect(markets).toEqual(["btts_yes", "home_win", "over_25"]);

    const homeWin = drafts.find((d: { market: string }) => d.market === "home_win");
    expect(homeWin).toMatchObject({
      title: "Time A FC vence",
      probability: 67,
      confidence: "high",
      odds: 1.4,
      status: "draft",
    });

    // Draft nunca aparece no site público
    expect(await asJson(await api("/tips/today"))).toEqual([]);
  });

  it("não duplica sugestão do mesmo mercado no mesmo jogo", async () => {
    await seedMatchFromApi(hojeAs(22));
    stubRoutes["/odds?eventId=5001"] = ODDS_5001;

    const headers = await login();
    await api("/admin/ingest", { method: "POST", headers, body: JSON.stringify({ task: "suggestions" }) });
    await api("/admin/ingest", { method: "POST", headers, body: JSON.stringify({ task: "suggestions" }) });

    expect(await db.select().from(tips)).toHaveLength(3);
  });

  it("não sugere mercados sem favorito claro (probabilidade abaixo do corte)", async () => {
    await seedMatchFromApi(hojeAs(22));
    stubRoutes["/odds?eventId=5001"] = {
      id: 5001,
      bookmakers: {
        "1xbet": [{ name: "ML", odds: [{ home: "2.60", draw: "3.20", away: "2.80" }] }],
      },
    };

    const headers = await login();
    await api("/admin/ingest", { method: "POST", headers, body: JSON.stringify({ task: "suggestions" }) });

    expect(await db.select().from(tips)).toHaveLength(0);
  });
});

// ─── Publicação (draft → published) ──────────────────────────────────────────

describe("publicação de sugestão", () => {
  it("exige odd válida para publicar e coloca a dica no ar", async () => {
    const match = await seedMatchFromApi(hojeAs(22));
    const [draft] = await db
      .insert(tips)
      .values({ matchId: match.id, title: "Time A FC vence", market: "home_win", probability: 67, status: "draft" })
      .returning();

    const headers = await login();

    const semOdd = await api(`/admin/tips/${draft.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ status: "published" }),
    });
    expect(semOdd.status).toBe(400);

    await api(`/admin/tips/${draft.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ odds: 1.4 }),
    });
    const publicada = await api(`/admin/tips/${draft.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ status: "published" }),
    });
    expect(publicada.status).toBe(200);

    const noAr = await asJson(await api("/tips/today"));
    expect(noAr).toHaveLength(1);
    expect(noAr[0]).toMatchObject({ odds: 1.4, probability: 67, status: "published" });
  });
});

// ─── Tarefa: settle (apuração pelo placar) ───────────────────────────────────

describe("POST /admin/ingest — settle", () => {
  it("apura green pelo placar real, encerra o jogo e expõe o placar", async () => {
    const match = await seedMatchFromApi(hojeAs(1));
    await db.insert(tips).values({
      matchId: match.id,
      title: "Time A FC vence",
      market: "home_win",
      odds: "1.40",
      status: "published",
    });
    stubRoutes["/events?sport=football"] = [
      { ...EVENTO_FUTURO, date: hojeAs(1), status: "settled", scores: { home: 2, away: 1 } },
    ];

    const headers = await login();
    const res = await api("/admin/ingest", {
      method: "POST",
      headers,
      body: JSON.stringify({ task: "settle" }),
    });
    expect(res.status).toBe(200);

    const results = await asJson(await api("/tips/results"));
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      result: "won",
      settledBy: "auto",
      match: { status: "finished", homeScore: 2, awayScore: 1 },
    });
  });

  it("anula (void) as dicas de jogo cancelado", async () => {
    const match = await seedMatchFromApi(hojeAs(1));
    await db.insert(tips).values({
      matchId: match.id,
      title: "Ambas marcam",
      market: "btts_yes",
      odds: "1.60",
      status: "published",
    });
    stubRoutes["/events?sport=football"] = [
      { ...EVENTO_FUTURO, date: hojeAs(1), status: "cancelled", scores: null },
    ];

    const headers = await login();
    await api("/admin/ingest", { method: "POST", headers, body: JSON.stringify({ task: "settle" }) });

    const results = await asJson(await api("/tips/results"));
    expect(results[0]).toMatchObject({ result: "void", settledBy: "auto" });
  });

  it("admin consegue corrigir (override) um resultado apurado automaticamente", async () => {
    const match = await seedMatchFromApi(hojeAs(1));
    const [tip] = await db
      .insert(tips)
      .values({
        matchId: match.id,
        title: "Time A FC vence",
        market: "home_win",
        odds: "1.40",
        status: "published",
      })
      .returning();
    stubRoutes["/events?sport=football"] = [
      { ...EVENTO_FUTURO, date: hojeAs(1), status: "settled", scores: { home: 2, away: 1 } },
    ];

    const headers = await login();
    await api("/admin/ingest", { method: "POST", headers, body: JSON.stringify({ task: "settle" }) });

    const patch = await api(`/admin/tips/${tip.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ result: "lost" }),
    });
    expect(patch.status).toBe(200);

    const results = await asJson(await api("/tips/results"));
    expect(results[0]).toMatchObject({ result: "lost", settledBy: "admin" });
  });
});
