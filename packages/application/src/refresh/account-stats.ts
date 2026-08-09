import type { Database } from "@hhuacm-dashboard/db";
import { atcoderAccountStats } from "@hhuacm-dashboard/db/schema/atcoder-account-stats";
import { codeforcesAccountStats } from "@hhuacm-dashboard/db/schema/codeforces-account-stats";
import { currentMember } from "@hhuacm-dashboard/db/schema/current-member";
import { luoguAccountStats } from "@hhuacm-dashboard/db/schema/luogu-account-stats";
import { nowcoderAccountStats } from "@hhuacm-dashboard/db/schema/nowcoder-account-stats";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import {
  type OjPlatform,
  ojPlatformNames,
  type RefreshSyncStatus,
} from "@hhuacm-dashboard/domain";
import { and, eq, isNull, lt, or } from "drizzle-orm";
import type { AnySQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";
import {
  markAtcoderAccountStatsRefreshFailed,
  syncAtcoderAccountStats,
} from "../services/atcoder/sync";
import {
  markCodeforcesAccountStatsRefreshFailed,
  syncCodeforcesAccountStats,
} from "../services/codeforces/sync";
import {
  markLuoguAccountStatsRefreshFailed,
  syncLuoguAccountStats,
} from "../services/luogu/sync";
import {
  markNowcoderAccountStatsRefreshFailed,
  syncNowcoderAccountStats,
} from "../services/nowcoder/sync";
import type { OjAccountIdentity } from "../services/oj-account/queries";
import { isAccountStatsCacheFresh, refreshDefaults } from "./policy";
import {
  enqueueRefreshRequest,
  getQueuedRefreshTargetIds,
  type RefreshRequestKind,
} from "./request-store";
import { getRefreshSyncStatus } from "./sync-status";

export const accountStatsRefreshKindByPlatform = {
  atcoder: "atcoder.accountStats",
  codeforces: "codeforces.accountStats",
  luogu: "luogu.accountStats",
  nowcoder: "nowcoder.accountStats",
} as const satisfies Record<OjPlatform, RefreshRequestKind>;

interface AccountStatsRefreshSnapshot {
  accountId: string;
  fetchedAt: Date | null;
  lastError: null | string;
}

interface AccountStatsRefreshStatuses {
  syncStatusOf: (account: AccountStatsRefreshSnapshot) => RefreshSyncStatus;
}

export const ensureAccountStatsRefresh = async (
  db: Database,
  input: AccountStatsRefreshSnapshot & {
    now?: Date;
    platform: OjPlatform;
  }
): Promise<RefreshSyncStatus> =>
  (
    await ensureAccountStatsRefreshes(db, {
      accounts: [input],
      now: input.now,
      platform: input.platform,
    })
  ).syncStatusOf(input);

export const ensureAccountStatsRefreshes = async (
  db: Database,
  input: {
    accounts: readonly AccountStatsRefreshSnapshot[];
    now?: Date;
    platform: OjPlatform;
  }
): Promise<AccountStatsRefreshStatuses> => {
  const kind = accountStatsRefreshKindByPlatform[input.platform];
  const now = input.now ?? new Date();

  for (const account of input.accounts) {
    if (!isAccountStatsCacheFresh(account.fetchedAt, now)) {
      await enqueueRefreshRequest(db, {
        kind,
        targetId: account.accountId,
      });
    }
  }

  const queuedAccountIds = await getQueuedRefreshTargetIds(db, {
    kind,
    targetIds: input.accounts.map((account) => account.accountId),
  });
  return {
    syncStatusOf: (account) =>
      getRefreshSyncStatus({
        fetchedAt: account.fetchedAt,
        isQueued: queuedAccountIds.has(account.accountId),
        lastError: account.lastError,
      }),
  };
};

type AccountStatsRefreshHandler = (
  db: Database,
  targetId: string
) => Promise<void>;

type AccountStatsEffect = (
  db: Database,
  account: OjAccountIdentity
) => Promise<void>;

interface AccountStatsRefreshDefinition {
  accountId: AnySQLiteColumn;
  fetchedAt: AnySQLiteColumn;
  handler: AccountStatsRefreshHandler;
  kind: (typeof accountStatsRefreshKindByPlatform)[OjPlatform];
  platform: OjPlatform;
  table: SQLiteTable;
}

const accountFields = {
  externalId: userOjAccount.externalId,
  handle: userOjAccount.handle,
  id: userOjAccount.id,
} as const;

const createAccountStatsRefreshHandler = (options: {
  markFailed: (
    db: Database,
    account: OjAccountIdentity,
    error: unknown
  ) => Promise<void>;
  platform: OjPlatform;
  sync: AccountStatsEffect;
}): AccountStatsRefreshHandler =>
  async function handleAccountStatsRefresh(db, targetId) {
    const [account] = await db
      .select(accountFields)
      .from(userOjAccount)
      .where(
        and(
          eq(userOjAccount.id, targetId),
          eq(userOjAccount.platform, options.platform)
        )
      )
      .limit(1);

    if (!account) {
      throw new Error(
        `${ojPlatformNames[options.platform]} account does not exist: ${targetId}`
      );
    }

    try {
      await options.sync(db, account);
    } catch (error) {
      await options.markFailed(db, account, error);
    }
  };

const accountStatsRefreshDefinitions = {
  atcoder: {
    accountId: atcoderAccountStats.accountId,
    fetchedAt: atcoderAccountStats.fetchedAt,
    handler: createAccountStatsRefreshHandler({
      markFailed: markAtcoderAccountStatsRefreshFailed,
      platform: "atcoder",
      sync: syncAtcoderAccountStats,
    }),
    kind: accountStatsRefreshKindByPlatform.atcoder,
    platform: "atcoder",
    table: atcoderAccountStats,
  },
  codeforces: {
    accountId: codeforcesAccountStats.accountId,
    fetchedAt: codeforcesAccountStats.fetchedAt,
    handler: createAccountStatsRefreshHandler({
      markFailed: markCodeforcesAccountStatsRefreshFailed,
      platform: "codeforces",
      sync: syncCodeforcesAccountStats,
    }),
    kind: accountStatsRefreshKindByPlatform.codeforces,
    platform: "codeforces",
    table: codeforcesAccountStats,
  },
  luogu: {
    accountId: luoguAccountStats.accountId,
    fetchedAt: luoguAccountStats.fetchedAt,
    handler: createAccountStatsRefreshHandler({
      markFailed: markLuoguAccountStatsRefreshFailed,
      platform: "luogu",
      sync: syncLuoguAccountStats,
    }),
    kind: accountStatsRefreshKindByPlatform.luogu,
    platform: "luogu",
    table: luoguAccountStats,
  },
  nowcoder: {
    accountId: nowcoderAccountStats.accountId,
    fetchedAt: nowcoderAccountStats.fetchedAt,
    handler: createAccountStatsRefreshHandler({
      markFailed: markNowcoderAccountStatsRefreshFailed,
      platform: "nowcoder",
      sync: syncNowcoderAccountStats,
    }),
    kind: accountStatsRefreshKindByPlatform.nowcoder,
    platform: "nowcoder",
    table: nowcoderAccountStats,
  },
} as const satisfies Record<OjPlatform, AccountStatsRefreshDefinition>;

export const accountStatsRefreshHandlers = {
  [accountStatsRefreshKindByPlatform.atcoder]:
    accountStatsRefreshDefinitions.atcoder.handler,
  [accountStatsRefreshKindByPlatform.codeforces]:
    accountStatsRefreshDefinitions.codeforces.handler,
  [accountStatsRefreshKindByPlatform.luogu]:
    accountStatsRefreshDefinitions.luogu.handler,
  [accountStatsRefreshKindByPlatform.nowcoder]:
    accountStatsRefreshDefinitions.nowcoder.handler,
};

const enqueueDueAccountStatsRequestsForPlatform = async (
  db: Database,
  now: Date,
  definition: AccountStatsRefreshDefinition
) => {
  const dueBefore = new Date(now.getTime() - refreshDefaults.accountStatsTtlMs);
  const dueAccounts = await db
    .select({ id: userOjAccount.id })
    .from(userOjAccount)
    .innerJoin(currentMember, eq(currentMember.userId, userOjAccount.userId))
    .leftJoin(definition.table, eq(definition.accountId, userOjAccount.id))
    .where(
      and(
        eq(userOjAccount.platform, definition.platform),
        or(
          isNull(definition.accountId),
          isNull(definition.fetchedAt),
          lt(definition.fetchedAt, dueBefore)
        )
      )
    );

  for (const account of dueAccounts) {
    await enqueueRefreshRequest(db, {
      kind: definition.kind,
      targetId: account.id,
    });
  }
};

export const enqueueDueAccountStatsRequests = async (
  db: Database,
  now: Date
) => {
  for (const definition of Object.values(accountStatsRefreshDefinitions)) {
    await enqueueDueAccountStatsRequestsForPlatform(db, now, definition);
  }
};
