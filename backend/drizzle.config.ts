import { readFileSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// drizzle-kit não lê .dev.vars automaticamente — carregamos manualmente
// para manter a connection string em um único arquivo (o mesmo do Wrangler).
function loadDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const content = readFileSync(".dev.vars", "utf-8");
  const match = content.match(/^DATABASE_URL=["']?(.+?)["']?\s*$/m);
  if (!match) {
    throw new Error(
      "DATABASE_URL não encontrada. Defina a variável de ambiente ou preencha backend/.dev.vars"
    );
  }
  return match[1];
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: loadDatabaseUrl(),
  },
});
