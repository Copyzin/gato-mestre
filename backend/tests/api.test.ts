import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../src/db";
import { sports } from "../src/db/schema";
import {
  asJson,
  createApi,
  createTestDb,
  resetDb,
  seedAdmin,
  seedSports,
  seedTip,
  type TestApp,
} from "./helpers";

let db: Db;
let app: TestApp;
let api: ReturnType<typeof createApi>;

beforeAll(async () => {
  db = await createTestDb();
  app = (await import("../src/app")).buildApp({ db });
  api = createApi(app);
});

beforeEach(async () => {
  await resetDb(db);
  await seedSports(db);
});

// ─── Rotas públicas ──────────────────────────────────────────────────────────

describe("GET / (health check)", () => {
  it("responde ok com o banco conectado", async () => {
    const res = await api("/");
    expect(res.status).toBe(200);
    const body = await asJson(res);
    expect(body.status).toBe("ok");
    expect(body.database).toBe("connected");
  });
});

describe("GET /sports", () => {
  it("lista os esportes cadastrados na ordem de relevância", async () => {
    const res = await api("/sports");
    expect(res.status).toBe(200);
    const body = await asJson(res);
    expect(body).toHaveLength(2);
    expect(body[0]).toMatchObject({ name: "Futebol", slug: "futebol", icon: "⚽" });
    expect(body[1]).toMatchObject({ name: "Basquete", slug: "basquete" });
  });
});

describe("GET /tips/today", () => {
  it("retorna só as dicas de jogos que começam hoje, com jogo e esporte embutidos", async () => {
    const now = new Date();
    const hoje = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 18));
    const amanha = new Date(hoje.getTime() + 30 * 60 * 60 * 1000);
    await seedTip(db, { startTime: hoje });
    await seedTip(db, { startTime: amanha });

    const res = await api("/tips/today");
    expect(res.status).toBe(200);
    const body = await asJson(res);

    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({
      title: "Mercado teste",
      odds: 1.9,
      result: "pending",
      match: { homeTeam: "Time A", awayTeam: "Time B", status: "scheduled" },
      sport: { slug: "futebol" },
    });
    expect(typeof body[0].odds).toBe("number");
    expect(typeof body[0].match.startTime).toBe("string");
  });

  it("retorna lista vazia quando não há dicas hoje", async () => {
    const res = await api("/tips/today");
    expect(res.status).toBe(200);
    expect(await asJson(res)).toEqual([]);
  });
});

describe("GET /tips/results", () => {
  it("retorna só dicas de jogos encerrados, mais recentes primeiro", async () => {
    const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const anteontem = new Date(Date.now() - 48 * 60 * 60 * 1000);
    await seedTip(db, { startTime: anteontem, matchStatus: "finished", result: "lost" });
    await seedTip(db, { startTime: ontem, matchStatus: "finished", result: "won" });
    await seedTip(db, { startTime: ontem, matchStatus: "scheduled" }); // não pode aparecer

    const res = await api("/tips/results");
    expect(res.status).toBe(200);
    const body = await asJson(res);

    expect(body).toHaveLength(2);
    expect(body[0].result).toBe("won"); // mais recente primeiro
    expect(body[1].result).toBe("lost");
    expect(body[0].match.status).toBe("finished");
  });
});

// ─── Auth ────────────────────────────────────────────────────────────────────

describe("POST /auth/login", () => {
  const ip = (n: number) => ({ "cf-connecting-ip": `10.0.0.${n}` });

  it("rejeita senha errada com 401", async () => {
    await seedAdmin(db, "senha-certa");
    const res = await api("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...ip(1) },
      body: JSON.stringify({ email: "admin@teste.local", password: "senha-errada" }),
    });
    expect(res.status).toBe(401);
  });

  it("devolve um token JWT quando e-mail e senha estão corretos", async () => {
    await seedAdmin(db, "senha-certa");
    const res = await api("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...ip(2) },
      body: JSON.stringify({ email: "admin@teste.local", password: "senha-certa" }),
    });
    expect(res.status).toBe(200);
    const body = await asJson(res);
    expect(typeof body.token).toBe("string");
    expect(body.email).toBe("admin@teste.local");
  });

  it("bloqueia com 429 após 5 tentativas do mesmo IP", async () => {
    await seedAdmin(db, "senha-certa");
    for (let i = 0; i < 5; i++) {
      await api("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...ip(3) },
        body: JSON.stringify({ email: "admin@teste.local", password: "errada" }),
      });
    }
    const res = await api("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...ip(3) },
      body: JSON.stringify({ email: "admin@teste.local", password: "errada" }),
    });
    expect(res.status).toBe(429);
  });
});

// ─── Admin (rotas protegidas) ────────────────────────────────────────────────

describe("rotas /admin/*", () => {
  async function login() {
    await seedAdmin(db, "senha-certa");
    const res = await api("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "cf-connecting-ip": "10.0.0.10" },
      body: JSON.stringify({ email: "admin@teste.local", password: "senha-certa" }),
    });
    const body = await asJson(res);
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${body.token}`,
    };
  }

  it("recusa acesso sem token com 401", async () => {
    const res = await api("/admin/tips");
    expect(res.status).toBe(401);
  });

  it("admin publica dica sobre um jogo cadastrado", async () => {
    const headers = await login();
    const [sport] = await db.select().from(sports).limit(1);

    const matchRes = await api("/admin/matches", {
      method: "POST",
      headers,
      body: JSON.stringify({
        sportId: sport.id,
        league: "Brasileirão",
        homeTeam: "Flamengo",
        awayTeam: "Palmeiras",
        startTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
      }),
    });
    expect(matchRes.status).toBe(201);
    const match = await asJson(matchRes);

    const tipRes = await api("/admin/tips", {
      method: "POST",
      headers,
      body: JSON.stringify({ matchId: match.id, title: "Ambas marcam", odds: 1.85, confidence: "high" }),
    });
    expect(tipRes.status).toBe(201);
  });

  it("rejeita payload inválido com 400", async () => {
    const headers = await login();
    const res = await api("/admin/tips", {
      method: "POST",
      headers,
      body: JSON.stringify({ matchId: -1, title: "", odds: -2 }),
    });
    expect(res.status).toBe(400);
    const body = await asJson(res);
    expect(body.error).toBe("Dados inválidos.");
  });

  it("ao marcar green/red/void, o jogo é encerrado e a dica vai para /tips/results", async () => {
    const headers = await login();
    const { tip } = await seedTip(db, { startTime: new Date() });

    const patch = await api(`/admin/tips/${tip.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ result: "won" }),
    });
    expect(patch.status).toBe(200);

    const res = await api("/tips/results");
    const results = await asJson(res);
    const apurada = results.find((t: { id: number }) => t.id === tip.id);
    expect(apurada).toBeDefined();
    expect(apurada.result).toBe("won");
    expect(apurada.match.status).toBe("finished");
  });

  it("dica excluída some das listagens públicas", async () => {
    const headers = await login();
    const { tip } = await seedTip(db, { startTime: new Date() });

    const del = await api(`/admin/tips/${tip.id}`, { method: "DELETE", headers });
    expect(del.status).toBe(200);

    const res = await api("/tips/today");
    expect(await asJson(res)).toEqual([]);
  });
});
