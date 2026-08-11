import {
  boolean,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const matchStatusEnum = pgEnum("match_status", [
  "scheduled",
  "live",
  "finished",
]);

export const confidenceEnum = pgEnum("confidence", ["low", "medium", "high"]);

export const tipResultEnum = pgEnum("tip_result", [
  "pending",
  "won",
  "lost",
  "void",
]);

export const bannerPositionEnum = pgEnum("banner_position", [
  "hero",
  "sidebar",
  "footer",
]);

// Ciclo de vida da dica: sugestões automáticas nascem como rascunho (draft)
// e só vão ao ar quando o admin publica.
export const tipStatusEnum = pgEnum("tip_status", ["draft", "published"]);

// Mercados estruturados — permitem a apuração automática pelo placar.
// Dicas manuais podem não ter mercado (apuração manual nesse caso).
export const tipMarketEnum = pgEnum("tip_market", [
  "home_win",
  "draw",
  "away_win",
  "over_25",
  "under_25",
  "btts_yes",
  "btts_no",
]);

// Quem apurou o resultado: o sistema (pelo placar da API) ou o admin (override).
export const settledByEnum = pgEnum("settled_by", ["auto", "admin"]);

// ─── Tabelas ─────────────────────────────────────────────────────────────────

export const sports = pgTable("sports", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  icon: text("icon"),
});

export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  sportId: integer("sport_id")
    .notNull()
    .references(() => sports.id),
  league: text("league").notNull(),
  homeTeam: text("home_team").notNull(),
  awayTeam: text("away_team").notNull(),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  status: matchStatusEnum("status").notNull().default("scheduled"),
  // ID do fixture na fonte externa (ex.: API-Sports) — garante ingestão idempotente
  externalId: text("external_id").unique(),
  homeScore: integer("home_score"),
  awayScore: integer("away_score"),
});

export const tips = pgTable("tips", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id")
    .notNull()
    .references(() => matches.id),
  title: text("title").notNull(),
  description: text("description"),
  // Odd nullable: sugestões (draft) podem nascer sem odd — obrigatória na publicação
  odds: numeric("odds", { precision: 5, scale: 2 }),
  confidence: confidenceEnum("confidence").notNull().default("medium"),
  result: tipResultEnum("result").notNull().default("pending"),
  status: tipStatusEnum("status").notNull().default("published"),
  market: tipMarketEnum("market"),
  // Probabilidade % calculada (ex.: /predictions da API-Sports), quando disponível
  probability: integer("probability"),
  settledBy: settledByEnum("settled_by"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const banners = pgTable("banners", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  imageUrl: text("image_url").notNull(),
  linkUrl: text("link_url"),
  position: bannerPositionEnum("position").notNull().default("hero"),
  active: boolean("active").notNull().default(true),
});

// Usuários do painel admin (poucos logins, permissões iguais)
export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Relações ────────────────────────────────────────────────────────────────

export const sportsRelations = relations(sports, ({ many }) => ({
  matches: many(matches),
}));

export const matchesRelations = relations(matches, ({ one, many }) => ({
  sport: one(sports, {
    fields: [matches.sportId],
    references: [sports.id],
  }),
  tips: many(tips),
}));

export const tipsRelations = relations(tips, ({ one }) => ({
  match: one(matches, {
    fields: [tips.matchId],
    references: [matches.id],
  }),
}));
