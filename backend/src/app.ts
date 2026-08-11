import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { and, desc, eq, gte, lt } from "drizzle-orm";
import { z } from "zod";
import { createDb, type Db } from "./db";
import { banners, matches, sports, tips } from "./db/schema";
import type { FetchImpl } from "./ingestion/odds-api-io";
import authRoutes from "./routes/auth";
import adminRoutes from "./routes/admin";
import type { Bindings, Variables } from "./types";

type AppDeps = {
  /**
   * Conexão injetada (testes). Quando ausente, a conexão é criada por request
   * a partir de env.DATABASE_URL — obrigatório no Workers, onde o env só
   * existe no contexto da execução.
   */
  db?: Db;
  /** fetch injetável (testes stubam as APIs externas); padrão: fetch global */
  fetchImpl?: FetchImpl;
};

export function buildApp(deps: AppDeps = {}) {
  const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

  // Headers de segurança (X-Content-Type-Options, X-Frame-Options, Referrer-Policy etc.)
  app.use("*", secureHeaders());

  // CORS liberado apenas para o frontend local (Next.js em localhost:3000)
  app.use(
    "*",
    cors({
      origin: ["http://localhost:3000"],
      allowMethods: ["GET", "POST", "PATCH", "DELETE"],
      allowHeaders: ["Content-Type", "Authorization"],
      maxAge: 600,
    })
  );

  // Middleware: valida o env e injeta a conexão com o banco (+ fetch injetável)
  app.use("*", async (c, next) => {
    c.set("fetchImpl", deps.fetchImpl ?? fetch);

    if (deps.db) {
      c.set("db", deps.db);
      await next();
      return;
    }

    const env = z
      .object({ DATABASE_URL: z.string().min(1) })
      .safeParse({ DATABASE_URL: c.env.DATABASE_URL });

    if (!env.success) {
      return c.json(
        {
          error:
            "DATABASE_URL não configurada. Preencha backend/.dev.vars com a connection string do Neon.",
        },
        500
      );
    }

    c.set("db", createDb(env.data.DATABASE_URL));
    await next();
  });

  // ─── Rotas públicas ──────────────────────────────────────────────────────────

  // Health check — também serve para testar a conexão com o Neon
  app.get("/", async (c) => {
    try {
      const db = c.get("db");
      const result = await db.select({ id: sports.id }).from(sports).limit(1);
      return c.json({
        service: "Gato Mestre API",
        status: "ok",
        database: "connected",
        environment: c.env.ENVIRONMENT,
        _probe: result.length,
      });
    } catch (err) {
      return c.json(
        {
          service: "Gato Mestre API",
          status: "error",
          database: "unreachable",
          error: err instanceof Error ? err.message : "Erro desconhecido",
        },
        500
      );
    }
  });

  // Lista todos os esportes (ordem de inserção = relevância; Futebol primeiro)
  app.get("/sports", async (c) => {
    const db = c.get("db");
    const rows = await db.select().from(sports).orderBy(sports.id);
    return c.json(rows);
  });

  // Dicas do dia (jogos que começam hoje, em UTC)
  app.get("/tips/today", async (c) => {
    const db = c.get("db");

    const now = new Date();
    const startOfDay = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const rows = await db
      .select({ tip: tips, match: matches, sport: sports })
      .from(tips)
      .innerJoin(matches, eq(tips.matchId, matches.id))
      .innerJoin(sports, eq(matches.sportId, sports.id))
      .where(
        and(
          eq(tips.status, "published"), // sugestões (draft) nunca aparecem no site
          gte(matches.startTime, startOfDay),
          lt(matches.startTime, endOfDay)
        )
      )
      .orderBy(matches.startTime);

    // Normaliza para os tipos compartilhados (numeric → number, Date → ISO string)
    const data = rows.map(({ tip, match, sport }) => ({
      id: tip.id,
      matchId: tip.matchId,
      title: tip.title,
      description: tip.description,
      odds: tip.odds === null ? null : Number(tip.odds),
      confidence: tip.confidence,
      result: tip.result,
      status: tip.status,
      market: tip.market,
      probability: tip.probability,
      settledBy: tip.settledBy,
      createdAt: tip.createdAt.toISOString(),
      match: {
        id: match.id,
        sportId: match.sportId,
        league: match.league,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        startTime: match.startTime.toISOString(),
        status: match.status,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
      },
      sport: {
        id: sport.id,
        name: sport.name,
        slug: sport.slug,
        icon: sport.icon,
      },
    }));

    return c.json(data);
  });

  // Resultados: dicas de jogos encerrados, mais recentes primeiro (tela /resultados)
  app.get("/tips/results", async (c) => {
    const db = c.get("db");

    const rows = await db
      .select({ tip: tips, match: matches, sport: sports })
      .from(tips)
      .innerJoin(matches, eq(tips.matchId, matches.id))
      .innerJoin(sports, eq(matches.sportId, sports.id))
      .where(and(eq(tips.status, "published"), eq(matches.status, "finished")))
      .orderBy(desc(matches.startTime))
      .limit(100);

    // Mesmo shape de GET /tips/today (TipWithMatch[])
    const data = rows.map(({ tip, match, sport }) => ({
      id: tip.id,
      matchId: tip.matchId,
      title: tip.title,
      description: tip.description,
      odds: tip.odds === null ? null : Number(tip.odds),
      confidence: tip.confidence,
      result: tip.result,
      status: tip.status,
      market: tip.market,
      probability: tip.probability,
      settledBy: tip.settledBy,
      createdAt: tip.createdAt.toISOString(),
      match: {
        id: match.id,
        sportId: match.sportId,
        league: match.league,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        startTime: match.startTime.toISOString(),
        status: match.status,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
      },
      sport: {
        id: sport.id,
        name: sport.name,
        slug: sport.slug,
        icon: sport.icon,
      },
    }));

    return c.json(data);
  });

  // Banners ativos
  app.get("/banners", async (c) => {
    const db = c.get("db");
    const rows = await db
      .select()
      .from(banners)
      .where(eq(banners.active, true))
      .orderBy(banners.id);
    return c.json(rows);
  });

  // ─── Rotas de auth e admin ───────────────────────────────────────────────────

  app.route("/auth", authRoutes);
  app.route("/admin", adminRoutes);

  return app;
}
