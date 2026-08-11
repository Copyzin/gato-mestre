import { buildApp } from "./app";
import { runScheduled } from "./ingestion";
import type { Bindings } from "./types";

const app = buildApp();

// Entry do Worker: fetch (HTTP) + scheduled (Cron Triggers de ingestão,
// configurados no wrangler.toml). Tipos de ScheduledEvent/ExecutionContext
// declarados minimalistas para não exigir @cloudflare/workers-types.
export default {
  fetch: app.fetch,
  scheduled: (
    event: { cron: string },
    env: Bindings,
    ctx: { waitUntil(promise: Promise<unknown>): void }
  ) => {
    ctx.waitUntil(runScheduled(env, event.cron));
  },
};
