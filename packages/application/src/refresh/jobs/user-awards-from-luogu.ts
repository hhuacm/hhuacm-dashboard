import type { Database } from "@hhuacm-dashboard/db";
import { currentMember } from "@hhuacm-dashboard/db/schema/current-member";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { userAwardSync } from "@hhuacm-dashboard/db/schema/user-award";
import { and, eq, isNull, lt, or } from "drizzle-orm";
import {
  markUserAwardsFromLuoguRefreshFailed,
  syncUserAwardsFromLuogu,
} from "../../services/profile-awards";
import { refreshDefaults } from "../policy";
import { defineRefreshJob, type RefreshJobDefinition } from "./definition";

const userAwardSource = "luogu";

const luoguAccountFields = {
  externalId: userOjAccount.externalId,
  handle: userOjAccount.handle,
  id: userOjAccount.id,
  userId: userOjAccount.userId,
} as const;

const handleUserAwardsFromLuoguRequest = async (
  db: Database,
  request: Parameters<RefreshJobDefinition["handle"]>[1]
) => {
  const [account] = await db
    .select(luoguAccountFields)
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

  try {
    await syncUserAwardsFromLuogu(db, account);
  } catch (error) {
    await markUserAwardsFromLuoguRefreshFailed(db, account, error);
  }
};

const enqueueDueUserAwardsFromLuoguTargets = async (
  db: Database,
  now: Date
) => {
  const dueBefore = new Date(now.getTime() - refreshDefaults.userAwardsTtlMs);
  const dueAccounts = await db
    .select(luoguAccountFields)
    .from(userOjAccount)
    .innerJoin(currentMember, eq(currentMember.userId, userOjAccount.userId))
    .leftJoin(
      userAwardSync,
      and(
        eq(userAwardSync.userId, userOjAccount.userId),
        eq(userAwardSync.source, userAwardSource)
      )
    )
    .where(
      and(
        eq(userOjAccount.platform, "luogu"),
        or(
          isNull(userAwardSync.userId),
          isNull(userAwardSync.fetchedAt),
          lt(userAwardSync.fetchedAt, dueBefore)
        )
      )
    );

  for (const account of dueAccounts) {
    await userAwardsFromLuoguJob.enqueue(db, account.id);
  }

  return dueAccounts.length;
};

export const userAwardsFromLuoguJob = defineRefreshJob({
  enqueueDueTargets: enqueueDueUserAwardsFromLuoguTargets,
  handle: handleUserAwardsFromLuoguRequest,
  kind: "user.awardsFromLuogu",
});
