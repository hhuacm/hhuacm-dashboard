import { currentMember } from "@hhuacm-dashboard/db/schema/current-member";
import { asc, sql } from "drizzle-orm";
import { enqueueRefreshIfDue } from "../../refresh/ensure";

export const userNameLabelSortExpression = sql<string>`coalesce(nullif(trim(${currentMember.realName}), ''), nullif(trim(${currentMember.username}), ''), '')`;

type FreshPolicy = (fetchedAt: Date | null, now: Date) => boolean;

export const rankUserNameOrder = [
  asc(userNameLabelSortExpression),
  asc(currentMember.userId),
] as const;

export const toIsoString = (date: Date | null) => date?.toISOString() ?? null;

export const ensureRankStatsRefreshRequests = async (input: {
  isFresh: FreshPolicy;
  now: Date;
  requestRefresh: (accountId: string) => Promise<void>;
  rows: { accountId: string; fetchedAt: Date | null }[];
}) => {
  for (const row of input.rows) {
    await enqueueRefreshIfDue({
      fetchedAt: row.fetchedAt,
      isFresh: input.isFresh,
      now: input.now,
      requestRefresh: async () => {
        await input.requestRefresh(row.accountId);
      },
    });
  }
};
