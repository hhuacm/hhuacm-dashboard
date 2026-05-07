import { env } from "@hhuacm-dashboard/env/server";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import {
  account,
  accountRelations,
  session,
  sessionRelations,
  user,
  userRelations,
  verification,
} from "./schema/auth";

const schema = {
  account,
  accountRelations,
  session,
  sessionRelations,
  user,
  userRelations,
  verification,
} as const;

export function createDb() {
  const client = createClient({
    url: env.DATABASE_URL,
    authToken: env.DATABASE_AUTH_TOKEN,
  });

  return drizzle({ client, schema });
}

export const db = createDb();
