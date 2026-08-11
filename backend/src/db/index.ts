import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Cria uma conexão Drizzle com o Neon (driver serverless via HTTP).
 * Deve ser chamada dentro do handler da request, pois no Workers
 * o env só existe no contexto da execução.
 */
export function createDb(databaseUrl: string) {
  const sql = neon(databaseUrl);
  return drizzle(sql, { schema });
}

export type Db = ReturnType<typeof createDb>;
