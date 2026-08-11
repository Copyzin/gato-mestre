import { z } from "zod";

// ─── Sports ──────────────────────────────────────────────────────────────────

export const sportSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  icon: z.string().nullable(),
});

export type Sport = z.infer<typeof sportSchema>;

// ─── Matches ─────────────────────────────────────────────────────────────────

export const matchSchema = z.object({
  id: z.number(),
  sportId: z.number(),
  league: z.string(),
  homeTeam: z.string(),
  awayTeam: z.string(),
  startTime: z.string(), // ISO 8601
  status: z.enum(["scheduled", "live", "finished"]),
  homeScore: z.number().nullable(),
  awayScore: z.number().nullable(),
});

export type Match = z.infer<typeof matchSchema>;

// ─── Tips ────────────────────────────────────────────────────────────────────

export const tipMarketSchema = z.enum([
  "home_win",
  "draw",
  "away_win",
  "over_25",
  "under_25",
  "btts_yes",
  "btts_no",
]);

export type TipMarket = z.infer<typeof tipMarketSchema>;

export const tipSchema = z.object({
  id: z.number(),
  matchId: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  // Odd nullable: sugestões (draft) podem não ter odd até a revisão do admin
  odds: z.number().nullable(),
  confidence: z.enum(["low", "medium", "high"]),
  result: z.enum(["pending", "won", "lost", "void"]),
  // draft = sugestão automática aguardando revisão; published = no ar
  status: z.enum(["draft", "published"]),
  market: tipMarketSchema.nullable(),
  // Probabilidade % calculada (ex.: /predictions), quando disponível
  probability: z.number().nullable(),
  // Quem apurou: sistema (pelo placar) ou admin (override)
  settledBy: z.enum(["auto", "admin"]).nullable(),
  createdAt: z.string(), // ISO 8601
});

export type Tip = z.infer<typeof tipSchema>;

/** Dica enriquecida com dados do jogo e do esporte (resposta de GET /tips/today) */
export const tipWithMatchSchema = tipSchema.extend({
  match: matchSchema,
  sport: sportSchema,
});

export type TipWithMatch = z.infer<typeof tipWithMatchSchema>;

/** Jogo enriquecido com o esporte (resposta de GET /admin/matches) */
export const matchWithSportSchema = matchSchema.extend({
  sport: sportSchema,
});

export type MatchWithSport = z.infer<typeof matchWithSportSchema>;

// ─── Banners ─────────────────────────────────────────────────────────────────

export const bannerSchema = z.object({
  id: z.number(),
  title: z.string(),
  imageUrl: z.string().url(),
  linkUrl: z.string().url().nullable(),
  position: z.enum(["hero", "sidebar", "footer"]),
  active: z.boolean(),
});

export type Banner = z.infer<typeof bannerSchema>;

// ─── API responses ───────────────────────────────────────────────────────────

export interface ApiError {
  error: string;
}
