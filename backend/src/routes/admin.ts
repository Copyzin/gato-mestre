import { Hono } from "hono";
import { jwt } from "hono/jwt";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { banners, matches, sports, tips } from "../db/schema";
import type { Bindings, Variables } from "../types";

// ─── Schemas de entrada ──────────────────────────────────────────────────────

const matchInput = z.object({
  sportId: z.number().int().positive(),
  league: z.string().min(1).max(120),
  homeTeam: z.string().min(1).max(120),
  awayTeam: z.string().min(1).max(120),
  startTime: z.string().datetime({ offset: true }),
  status: z.enum(["scheduled", "live", "finished"]).optional(),
});

const tipInput = z.object({
  matchId: z.number().int().positive(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).nullish(),
  odds: z.number().positive().max(1000),
  confidence: z.enum(["low", "medium", "high"]).optional(),
  result: z.enum(["pending", "won", "lost", "void"]).optional(),
});

const bannerInput = z.object({
  title: z.string().min(1).max(200),
  imageUrl: z.string().url().max(500),
  linkUrl: z.string().url().max(500).nullish(),
  position: z.enum(["hero", "sidebar", "footer"]).optional(),
  active: z.boolean().optional(),
});

function badRequest(c: { json: (body: unknown, status: number) => Response }, issues: unknown) {
  return c.json({ error: "Dados inválidos.", issues }, 400);
}

// ─── Rotas admin (todas protegidas por JWT) ──────────────────────────────────

export const adminRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()
  .use("*", async (c, next) => {
    if (!c.env.JWT_SECRET) {
      return c.json({ error: "JWT_SECRET não configurado no Worker." }, 500);
    }
    return jwt({ secret: c.env.JWT_SECRET, alg: "HS256" })(c, next);
  })

  // Lista tudo para o painel (inclui passadas e pendentes)
  .get("/matches", async (c) => {
    const db = c.get("db");
    const rows = await db
      .select({ match: matches, sport: sports })
      .from(matches)
      .innerJoin(sports, eq(matches.sportId, sports.id))
      .orderBy(desc(matches.startTime))
      .limit(200);

    return c.json(
      rows.map(({ match, sport }) => ({
        id: match.id,
        sportId: match.sportId,
        league: match.league,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        startTime: match.startTime.toISOString(),
        status: match.status,
        sport: { id: sport.id, name: sport.name, slug: sport.slug, icon: sport.icon },
      }))
    );
  })

  .get("/tips", async (c) => {
    const db = c.get("db");
    const rows = await db
      .select({ tip: tips, match: matches, sport: sports })
      .from(tips)
      .innerJoin(matches, eq(tips.matchId, matches.id))
      .innerJoin(sports, eq(matches.sportId, sports.id))
      .orderBy(desc(matches.startTime))
      .limit(200);

    return c.json(
      rows.map(({ tip, match, sport }) => ({
        id: tip.id,
        matchId: tip.matchId,
        title: tip.title,
        description: tip.description,
        odds: Number(tip.odds),
        confidence: tip.confidence,
        result: tip.result,
        createdAt: tip.createdAt.toISOString(),
        match: {
          id: match.id,
          sportId: match.sportId,
          league: match.league,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          startTime: match.startTime.toISOString(),
          status: match.status,
        },
        sport: { id: sport.id, name: sport.name, slug: sport.slug, icon: sport.icon },
      }))
    );
  })

  .post("/matches", async (c) => {
    const parsed = matchInput.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return badRequest(c, parsed.error.issues);

    const db = c.get("db");
    const [created] = await db
      .insert(matches)
      .values({ ...parsed.data, startTime: new Date(parsed.data.startTime) })
      .returning();
    return c.json(created, 201);
  })

  .patch("/matches/:id", async (c) => {
    const parsed = matchInput.partial().safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return badRequest(c, parsed.error.issues);

    const { startTime, ...rest } = parsed.data;
    const values = { ...rest, ...(startTime ? { startTime: new Date(startTime) } : {}) };

    const db = c.get("db");
    const [updated] = await db
      .update(matches)
      .set(values)
      .where(eq(matches.id, Number(c.req.param("id"))))
      .returning();
    if (!updated) return c.json({ error: "Jogo não encontrado." }, 404);
    return c.json(updated);
  })

  .post("/tips", async (c) => {
    const parsed = tipInput.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return badRequest(c, parsed.error.issues);

    const db = c.get("db");
    const [created] = await db
      .insert(tips)
      .values({ ...parsed.data, odds: String(parsed.data.odds) })
      .returning();
    return c.json(created, 201);
  })

  .patch("/tips/:id", async (c) => {
    const parsed = tipInput.partial().safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return badRequest(c, parsed.error.issues);

    const { odds, ...rest } = parsed.data;
    const values = { ...rest, ...(odds !== undefined ? { odds: String(odds) } : {}) };

    const db = c.get("db");
    const [updated] = await db
      .update(tips)
      .set(values)
      .where(eq(tips.id, Number(c.req.param("id"))))
      .returning();
    if (!updated) return c.json({ error: "Dica não encontrada." }, 404);
    return c.json(updated);
  })

  .delete("/tips/:id", async (c) => {
    const db = c.get("db");
    const [deleted] = await db
      .delete(tips)
      .where(eq(tips.id, Number(c.req.param("id"))))
      .returning({ id: tips.id });
    if (!deleted) return c.json({ error: "Dica não encontrada." }, 404);
    return c.json({ ok: true });
  })

  .post("/banners", async (c) => {
    const parsed = bannerInput.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return badRequest(c, parsed.error.issues);

    const db = c.get("db");
    const [created] = await db.insert(banners).values(parsed.data).returning();
    return c.json(created, 201);
  })

  .patch("/banners/:id", async (c) => {
    const parsed = bannerInput.partial().safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return badRequest(c, parsed.error.issues);

    const db = c.get("db");
    const [updated] = await db
      .update(banners)
      .set(parsed.data)
      .where(eq(banners.id, Number(c.req.param("id"))))
      .returning();
    if (!updated) return c.json({ error: "Banner não encontrado." }, 404);
    return c.json(updated);
  })

  .delete("/banners/:id", async (c) => {
    const db = c.get("db");
    const [deleted] = await db
      .delete(banners)
      .where(eq(banners.id, Number(c.req.param("id"))))
      .returning({ id: banners.id });
    if (!deleted) return c.json({ error: "Banner não encontrado." }, 404);
    return c.json({ ok: true });
  });

export default adminRoutes;
