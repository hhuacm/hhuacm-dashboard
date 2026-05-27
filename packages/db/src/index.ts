import { env } from "@hhuacm-dashboard/env/db";
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
import { currentMember } from "./schema/current-member";
import {
  luoguAcceptedProblem,
  luoguAcceptedProblemRelations,
  luoguAccountStats,
  luoguAccountStatsRelations,
} from "./schema/luogu-account-stats";
import { userOjAccount, userOjAccountRelations } from "./schema/oj-account";
import {
  problemSet,
  problemSetProblem,
  problemSetProblemRelations,
  problemSetRelations,
} from "./schema/problem-set";
import { userProfile, userProfileRelations } from "./schema/profile";
import {
  refreshRequest,
  refreshRequestRelations,
} from "./schema/refresh-request";
import { siteSetting } from "./schema/site-setting";
import {
  userAward,
  userAwardRelations,
  userAwardSync,
  userAwardSyncRelations,
} from "./schema/user-award";

const schema = {
  account,
  accountRelations,
  codeforcesAccountStats,
  codeforcesAccountStatsRelations,
  currentMember,
  luoguAcceptedProblem,
  luoguAcceptedProblemRelations,
  luoguAccountStats,
  luoguAccountStatsRelations,
  problemSet,
  problemSetProblem,
  problemSetProblemRelations,
  problemSetRelations,
  refreshRequest,
  refreshRequestRelations,
  session,
  sessionRelations,
  siteSetting,
  user,
  userAward,
  userAwardRelations,
  userAwardSync,
  userAwardSyncRelations,
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

export type Database = ReturnType<typeof createDb>;
export type DatabaseTransaction = Parameters<
  Parameters<Database["transaction"]>[0]
>[0];

export const db = createDb();
