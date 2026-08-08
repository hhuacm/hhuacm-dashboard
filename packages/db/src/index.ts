import { getDbEnv } from "@hhuacm-dashboard/env/db";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { schema } from "./schema/index";

export function createDb() {
  const env = getDbEnv();
  const client = createClient({
    url: env.DATABASE_URL,
    authToken: env.DATABASE_AUTH_TOKEN,
  });

  return drizzle({ client, schema });
}

export type Database = ReturnType<typeof createDb>;
export type DatabaseTransaction = Parameters<
  Parameters<Database["transaction"]>[0]
>[0];

let db: Database | undefined;

export const getDb = () => {
  db ??= createDb();

  return db;
};
