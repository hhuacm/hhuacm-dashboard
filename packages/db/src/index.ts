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
import {
  codeforcesAccountStats,
  codeforcesAccountStatsRelations,
} from "./schema/codeforces-account-stats";
import { userOjAccount, userOjAccountRelations } from "./schema/oj-account";
import { userProfile, userProfileRelations } from "./schema/profile";
import { refreshJob, refreshJobRelations } from "./schema/refresh-job";

const schema = {
  account,
  accountRelations,
  codeforcesAccountStats,
  codeforcesAccountStatsRelations,
  refreshJob,
  refreshJobRelations,
  session,
  sessionRelations,
  user,
  userOjAccount,
  userOjAccountRelations,
  userProfile,
  userProfileRelations,
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
