import type { Db } from "./db";

export type Bindings = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  ENVIRONMENT: string;
};

export type Variables = {
  db: Db;
};
