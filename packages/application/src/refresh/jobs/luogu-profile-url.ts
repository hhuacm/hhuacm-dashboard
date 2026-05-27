import type { Database } from "@hhuacm-dashboard/db";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { and, eq } from "drizzle-orm";
import { refreshLuoguProfileUrl } from "../../services/luogu/profile-url";
import type { LuoguUserSearchLoader } from "../../services/oj-profile-url";
import { defineRefreshJob, type RefreshJobDefinition } from "./definition";

const luoguProfileUrlAccountFields = {
  handle: userOjAccount.handle,
  id: userOjAccount.id,
} as const;

export const handleLuoguProfileUrlRequest = async (
  db: Database,
  request: Parameters<RefreshJobDefinition["handle"]>[1],
  searchUsers?: LuoguUserSearchLoader
) => {
  const [account] = await db
    .select(luoguProfileUrlAccountFields)
    .from(userOjAccount)
    .where(
      and(
        eq(userOjAccount.id, request.targetId),
        eq(userOjAccount.platform, "luogu")
      )
    )
    .limit(1);

  if (!account) {
    throw new Error(`Luogu account does not exist: ${request.targetId}`);
  }

  await refreshLuoguProfileUrl(db, account, searchUsers);
};

const enqueueMissingLuoguProfileUrlTargets = async (
  db: Database,
  _now: Date
) => {
  const accounts = await db
    .select(luoguProfileUrlAccountFields)
    .from(userOjAccount)
    .where(
      and(eq(userOjAccount.platform, "luogu"), eq(userOjAccount.profileUrl, ""))
    );

  for (const account of accounts) {
    await luoguProfileUrlJob.enqueue(db, account.id);
  }

  return accounts.length;
};

export const luoguProfileUrlJob = defineRefreshJob({
  enqueueDueTargets: enqueueMissingLuoguProfileUrlTargets,
  handle: handleLuoguProfileUrlRequest,
  kind: "luogu.profileUrl",
});
