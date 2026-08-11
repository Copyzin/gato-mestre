// Orquestrador da ingestão: roda as tarefas do provider de futebol e serve
// tanto ao gatilho manual (POST /admin/ingest) quanto ao Cron Trigger.

import { createDb, type Db } from "../db";
import type { FetchImpl } from "./odds-api-io";
import { ingestFixtures, ingestSuggestions, settleTips } from "./football";

export type IngestionTask = "fixtures" | "suggestions" | "settle";

export type IngestionEnv = {
  DATABASE_URL: string;
  ODDS_API_IO_KEY?: string;
};

export async function runIngestion(
  db: Db,
  env: IngestionEnv,
  tasks: IngestionTask[],
  fetchImpl: FetchImpl = fetch
): Promise<Record<string, unknown>> {
  if (!env.ODDS_API_IO_KEY) {
    throw new Error("ODDS_API_IO_KEY não configurada (backend/.dev.vars ou wrangler secret).");
  }

  const summary: Record<string, unknown> = {};
  const now = new Date();
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  if (tasks.includes("fixtures")) {
    // Hoje + amanhã (janela de trabalho do site)
    const endOfTomorrow = new Date(startOfToday.getTime() + 48 * 60 * 60 * 1000);
    summary.fixtures = await ingestFixtures(db, fetchImpl, env.ODDS_API_IO_KEY, startOfToday, endOfTomorrow);
  }

  if (tasks.includes("suggestions")) {
    summary.suggestions = await ingestSuggestions(db, fetchImpl, env.ODDS_API_IO_KEY);
  }

  if (tasks.includes("settle")) {
    summary.settle = await settleTips(db, fetchImpl, env.ODDS_API_IO_KEY);
  }

  return summary;
}

/**
 * Handler do Cron Trigger (ver wrangler.toml):
 * - "7 9,17 * * *"      → 6h07 e 14h07 em Brasília: calendário + sugestões
 * - cron a cada 2 horas → apuração de resultados (placar → green/red)
 */
export async function runScheduled(env: IngestionEnv, cron: string): Promise<void> {
  const db = createDb(env.DATABASE_URL);
  const tasks: IngestionTask[] =
    cron === "7 9,17 * * *" ? ["fixtures", "suggestions"] : ["settle"];
  const summary = await runIngestion(db, env, tasks);
  console.log(`[ingestão] cron "${cron}" →`, JSON.stringify(summary));
}
