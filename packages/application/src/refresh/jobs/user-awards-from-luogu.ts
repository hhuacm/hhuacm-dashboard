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
import { enqueueRefreshRequest } from "../request-store";
import { userAwardsFromLuoguRefreshKind } from "../user-awards";

const userAwardSource = "luogu";

const luoguAccountFields = {
  externalId: userOjAccount.externalId,
  handle: userOjAccount.handle,
  id: userOjAccount.id,
  userId: userOjAccount.userId,
} as const;

export const handleUserAwardsFromLuoguRequest = async (
  db: Database,
  targetId: string
) => {
  const [account] = await db
    .select(luoguAccountFields)
    .from(userOjAccount)
    .innerJoin(currentMember, eq(currentMember.userId, userOjAccount.userId))
    .where(
      and(eq(userOjAccount.id, targetId), eq(userOjAccount.platform, "luogu"))
    )
    .limit(1);

  if (!account) {
    return;
  }

  try {
    await syncUserAwardsFromLuogu(db, account);
  } catch (error) {
    await markUserAwardsFromLuoguRefreshFailed(db, account, error);
  }
};

export const enqueueDueUserAwardsFromLuoguRequests = async (
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
    await enqueueRefreshRequest(db, {
      kind: userAwardsFromLuoguRefreshKind,
      targetId: account.id,
    });
  }
};
