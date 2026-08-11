import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import type { Db } from "../src/db";
import { buildApp } from "../src/app";
import * as schema from "../src/db/schema";
import { adminUsers, banners, matches, sports, tips } from "../src/db/schema";
import { hashPassword } from "../src/lib/password";

/** Env fake passado ao app.request — o db real é injetado via buildApp({ db }). */
export const testEnv = {
  DATABASE_URL: "pglite",
  JWT_SECRET: "segredo-de-teste-jwt",
  ENVIRONMENT: "test",
};

export type TestApp = ReturnType<typeof buildApp>;

/**
 * Banco Postgres real em memória (PGlite) com as migrations aplicadas.
 * Testes exercitam o sistema pela interface HTTP — o Postgres embarcado
 * substitui o Neon, não é um mock de colaborador interno.
 */
export async function createTestDb(): Promise<Db> {
  const pg = new PGlite();
  const drizzleDir = fileURLToPath(new URL("../drizzle", import.meta.url));
  const migrations = readdirSync(drizzleDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of migrations) {
    await pg.exec(readFileSync(join(drizzleDir, file), "utf-8"));
  }

  // PgliteDatabase tem a mesma superfície de query do NeonHttpDatabase;
  // o cast fica contido aqui, na fronteira de teste.
  return drizzle(pg, { schema }) as unknown as Db;
}

export function createApi(app: TestApp) {
  return (path: string, init?: RequestInit): Promise<Response> =>
    Promise.resolve(app.request(path, init, testEnv));
}

/** res.json() tipado — nos testes, o formato das respostas é o contrato verificado. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function asJson<T = any>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

/** Limpa todas as tabelas respeitando as FKs (dica → jogo → esporte). */
export async function resetDb(db: Db) {
  await db.delete(tips);
  await db.delete(banners);
  await db.delete(matches);
  await db.delete(sports);
  await db.delete(adminUsers);
}

export async function seedSports(db: Db) {
  await db.insert(sports).values([
    { name: "Futebol", slug: "futebol", icon: "⚽" },
    { name: "Basquete", slug: "basquete", icon: "🏀" },
  ]);
}

export async function seedAdmin(db: Db, password: string) {
  const [admin] = await db
    .insert(adminUsers)
    .values({ email: "admin@teste.local", passwordHash: await hashPassword(password) })
    .returning();
  return admin;
}

/** Cria jogo + dica direto no banco (arranjo de cenário, não verificação). */
export async function seedTip(
  db: Db,
  opts: { startTime: Date; matchStatus?: "scheduled" | "live" | "finished"; result?: "pending" | "won" | "lost" | "void" }
) {
  const [sport] = await db.select().from(sports).limit(1);
  const [match] = await db
    .insert(matches)
    .values({
      sportId: sport.id,
      league: "Liga Teste",
      homeTeam: "Time A",
      awayTeam: "Time B",
      startTime: opts.startTime,
      status: opts.matchStatus ?? "scheduled",
    })
    .returning();
  const [tip] = await db
    .insert(tips)
    .values({
      matchId: match.id,
      title: "Mercado teste",
      odds: "1.90",
      result: opts.result ?? "pending",
    })
    .returning();
  return { sport, match, tip };
}
