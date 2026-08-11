import type { Db } from "./db";
import type { FetchImpl } from "./ingestion/odds-api-io";

export type Bindings = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  ENVIRONMENT: string;
  // Chaves das APIs esportivas (ver analise-apis-esportivas-apostas.md)
  API_SPORTS_KEY?: string;
  ODDS_API_IO_KEY?: string;
  ODDSPAPI_API_KEY?: string;
};

export type Variables = {
  db: Db;
  // fetch injetável: produção usa o global; testes recebem um stub
  fetchImpl: FetchImpl;
};
