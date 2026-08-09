import type { Database } from "@hhuacm-dashboard/db";
import { isUserAwardsCacheFresh } from "./policy";
import {
  enqueueRefreshRequest,
  getQueuedRefreshTargetIds,
  type RefreshRequestKind,
} from "./request-store";
import { getRefreshSyncStatus } from "./sync-status";

export const userAwardsFromLuoguRefreshKind =
  "user.awardsFromLuogu" as const satisfies RefreshRequestKind;

export const ensureUserAwardsFromLuoguRefresh = async (
  db: Database,
  input: {
    accountId: null | string;
    canRefresh: boolean;
    fetchedAt: Date | null;
    lastError: null | string;
    now: Date;
  }
) => {
  const accountId = input.accountId;
  let isQueued = false;

  if (input.canRefresh && accountId !== null) {
    if (!isUserAwardsCacheFresh(input.fetchedAt, input.now)) {
      await enqueueRefreshRequest(db, {
        kind: userAwardsFromLuoguRefreshKind,
        targetId: accountId,
      });
    }

    const queuedAccountIds = await getQueuedRefreshTargetIds(db, {
      kind: userAwardsFromLuoguRefreshKind,
      targetIds: [accountId],
    });
    isQueued = queuedAccountIds.has(accountId);
  }

  return getRefreshSyncStatus({
    fetchedAt: input.fetchedAt,
    isQueued,
    lastError: input.lastError,
  });
};
