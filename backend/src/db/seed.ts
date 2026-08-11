/**
 * Seed de desenvolvimento — dados mockados para a v1.
 *
 * Roda em Node (não no Workers): `npm run seed`
 * Idempotente: se já existirem esportes no banco, aborta sem duplicar.
 *
 * Lê DATABASE_URL, ADMIN_EMAIL e ADMIN_PASSWORD de .dev.vars.
 * Se ADMIN_* não existirem, gera uma senha aleatória e imprime UMA vez.
 */
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { adminUsers, banners, matches, sports, tips } from "./schema";
import { hashPassword } from "../lib/password";

function loadVars(): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) vars[key] = value;
  }
  try {
    const content = readFileSync(".dev.vars", "utf-8");
    for (const match of content.matchAll(/^([A-Z_]+)=["']?(.+?)["']?\s*$/gm)) {
      vars[match[1]] ??= match[2];
    }
  } catch {
    // sem .dev.vars — depende só do process.env
  }
  return vars;
}

const SPORTS = [
  { name: "Futebol", slug: "futebol", icon: "⚽" },
  { name: "Basquete", slug: "basquete", icon: "🏀" },
  { name: "Tênis", slug: "tenis", icon: "🎾" },
  { name: "Vôlei", slug: "volei", icon: "🏐" },
  { name: "MMA", slug: "mma", icon: "🥋" },
  { name: "Futebol Americano", slug: "futebol-americano", icon: "🏈" },
  { name: "eSports", slug: "esports", icon: "🎮" },
  { name: "Boxe", slug: "boxe", icon: "🥊" },
  { name: "Dardos", slug: "dardos", icon: "🎯" },
  { name: "Vôlei de Praia", slug: "volei-de-praia", icon: "🏖️" },
  { name: "Hóquei", slug: "hoquei", icon: "🏒" },
  { name: "Beisebol", slug: "beisebol", icon: "⚾" },
  { name: "Tênis de Mesa", slug: "tenis-de-mesa", icon: "🏓" },
  { name: "Sinuca", slug: "sinuca", icon: "🎱" },
  { name: "Rugby League", slug: "rugby-league", icon: "🏉" },
  { name: "Rugby", slug: "rugby", icon: "🏉" },
  { name: "Futsal", slug: "futsal", icon: "🥅" },
  { name: "Críquete", slug: "criquete", icon: "🏏" },
  { name: "Badminton", slug: "badminton", icon: "🏸" },
  { name: "Futebol Australiano", slug: "futebol-australiano", icon: "🦘" },
] as const;

type SeedMatch = {
  sport: (typeof SPORTS)[number]["slug"];
  league: string;
  home: string;
  away: string;
  hourUtc: number; // hora de hoje em UTC
  status?: "scheduled" | "live" | "finished";
  tip: {
    title: string;
    odds: number;
    confidence: "low" | "medium" | "high";
    result?: "pending" | "won" | "lost" | "void";
  };
};

const MATCHES: SeedMatch[] = [
  {
    sport: "futebol", league: "Brasileirão Série A",
    home: "Flamengo", away: "Palmeiras", hourUtc: 21,
    tip: { title: "Ambas marcam", odds: 1.85, confidence: "high" },
  },
  {
    sport: "futebol", league: "Copa do Brasil",
    home: "Corinthians", away: "São Paulo", hourUtc: 23,
    tip: { title: "Over 2.5 gols", odds: 2.1, confidence: "medium" },
  },
  {
    sport: "basquete", league: "NBA",
    home: "Boston Celtics", away: "Los Angeles Lakers", hourUtc: 0,
    status: "finished",
    tip: { title: "Over 224.5 pontos", odds: 1.9, confidence: "medium", result: "won" },
  },
  {
    sport: "basquete", league: "NBB",
    home: "Franca", away: "Flamengo", hourUtc: 22,
    tip: { title: "Franca vence", odds: 1.7, confidence: "high" },
  },
  {
    sport: "tenis", league: "ATP Masters 1000",
    home: "Carlos Alcaraz", away: "Jannik Sinner", hourUtc: 14,
    tip: { title: "Alcaraz vence", odds: 2.2, confidence: "medium" },
  },
  {
    sport: "volei", league: "Superliga Masculina",
    home: "Sada Cruzeiro", away: "Minas Tênis Clube", hourUtc: 22,
    tip: { title: "Sada Cruzeiro vence", odds: 1.55, confidence: "high" },
  },
  {
    sport: "mma", league: "UFC",
    home: "Alex Pereira", away: "Magomed Ankalaev", hourUtc: 3,
    status: "finished",
    tip: { title: "Luta termina por nocaute", odds: 2.5, confidence: "low", result: "lost" },
  },
  {
    sport: "futebol-americano", league: "NFL",
    home: "Kansas City Chiefs", away: "Buffalo Bills", hourUtc: 17,
    tip: { title: "Chiefs -3.5 (handicap)", odds: 1.95, confidence: "high" },
  },
  {
    sport: "esports", league: "CBLOL",
    home: "LOUD", away: "paiN Gaming", hourUtc: 18,
    tip: { title: "LOUD vence o mapa 1", odds: 1.75, confidence: "medium" },
  },
  {
    sport: "boxe", league: "Peso Médio",
    home: "Esquiva Falcão", away: "Hebert Conceição", hourUtc: 1,
    status: "finished",
    tip: { title: "Luta vai à decisão dos juízes", odds: 3.2, confidence: "low", result: "won" },
  },
  {
    sport: "dardos", league: "Premier League Darts",
    home: "Luke Littler", away: "Michael van Gerwen", hourUtc: 20,
    tip: { title: "Littler vence", odds: 1.65, confidence: "medium" },
  },
  {
    sport: "hoquei", league: "NHL",
    home: "Toronto Maple Leafs", away: "Boston Bruins", hourUtc: 16,
    tip: { title: "Over 5.5 gols", odds: 2.05, confidence: "low" },
  },
  {
    sport: "beisebol", league: "MLB",
    home: "New York Yankees", away: "Houston Astros", hourUtc: 19,
    tip: { title: "Yankees vence", odds: 1.8, confidence: "medium" },
  },
  {
    sport: "tenis-de-mesa", league: "WTT Champions",
    home: "Hugo Calderano", away: "Fan Zhendong", hourUtc: 15,
    tip: { title: "Calderano vence um set", odds: 1.6, confidence: "medium" },
  },
  {
    sport: "futsal", league: "Liga Nacional de Futsal",
    home: "Magnus", away: "Joinville", hourUtc: 23,
    tip: { title: "Magnus vence", odds: 1.45, confidence: "high" },
  },
];

async function main() {
  const vars = loadVars();
  if (!vars.DATABASE_URL) {
    throw new Error("DATABASE_URL não encontrada em .dev.vars ou no ambiente.");
  }

  const db = drizzle(neon(vars.DATABASE_URL));

  // Idempotência: não duplicar seed
  const existing = await db.select({ id: sports.id }).from(sports).limit(1);
  if (existing.length > 0) {
    console.log("Banco já contém dados — seed abortado (nada foi alterado).");
    return;
  }

  console.log("Inserindo esportes...");
  const insertedSports = await db.insert(sports).values([...SPORTS]).returning();
  const sportIdBySlug = new Map(insertedSports.map((s) => [s.slug, s.id]));

  const startOfTodayUtc = new Date();
  startOfTodayUtc.setUTCHours(0, 0, 0, 0);

  console.log("Inserindo jogos e dicas...");
  for (const m of MATCHES) {
    const startTime = new Date(startOfTodayUtc.getTime() + m.hourUtc * 3_600_000);
    const [match] = await db
      .insert(matches)
      .values({
        sportId: sportIdBySlug.get(m.sport)!,
        league: m.league,
        homeTeam: m.home,
        awayTeam: m.away,
        startTime,
        status: m.status ?? "scheduled",
      })
      .returning();

    await db.insert(tips).values({
      matchId: match.id,
      title: m.tip.title,
      odds: String(m.tip.odds),
      confidence: m.tip.confidence,
      result: m.tip.result ?? "pending",
    });
  }

  console.log("Inserindo banners...");
  await db.insert(banners).values([
    {
      title: "Bônus de boas-vindas — casa parceira",
      imageUrl: "https://placehold.co/1200x300/18181b/22c55e?text=Banner+Casa+de+Apostas",
      linkUrl: "https://example.com/afiliado",
      position: "hero",
    },
    {
      title: "Banner lateral — casa parceira",
      imageUrl: "https://placehold.co/300x250/18181b/22c55e?text=Banner+Lateral",
      linkUrl: "https://example.com/afiliado",
      position: "sidebar",
    },
  ]);

  console.log("Criando usuário admin...");
  const email = vars.ADMIN_EMAIL ?? "admin@gatomestre.local";
  let password = vars.ADMIN_PASSWORD;
  let generated = false;
  if (!password) {
    password = crypto.getRandomValues(new Uint8Array(12))
      .reduce((acc, b) => acc + b.toString(36).padStart(2, "0"), "")
      .slice(0, 20);
    generated = true;
  }

  await db.insert(adminUsers).values({
    email: email.toLowerCase(),
    passwordHash: await hashPassword(password),
  });

  console.log("\nSeed concluído:");
  console.log(`  ${SPORTS.length} esportes, ${MATCHES.length} jogos com dica, 2 banners`);
  console.log(`  Admin: ${email}`);
  if (generated) {
    console.log(`  Senha gerada (anote agora, não será exibida de novo): ${password}`);
    console.log("  Para definir a sua, adicione ADMIN_EMAIL e ADMIN_PASSWORD no .dev.vars e rode o seed num banco vazio.");
  }
}

main().catch((err) => {
  console.error("Falha no seed:", err);
  process.exit(1);
});
