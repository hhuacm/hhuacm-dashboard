import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { userOjAccount } from "./oj-account";

export const atcoderAccountStats = sqliteTable(
  "atcoder_account_stats",
  {
    accountId: text("account_id")
      .primaryKey()
      .references(() => userOjAccount.id, { onDelete: "cascade" }),
    rating: integer("rating"),
    recentPerformanceAverage: integer("recent_performance_average"),
    fetchedAt: integer("fetched_at", { mode: "timestamp_ms" }),
    lastAttemptedAt: integer("last_attempted_at", {
      mode: "timestamp_ms",
    }).notNull(),
    lastError: text("last_error"),
  },
  (table) => [index("atcoder_account_stats_fetched_at_idx").on(table.fetchedAt)]
);

export const atcoderAccountStatsRelations = relations(
  atcoderAccountStats,
  ({ one }) => ({
    account: one(userOjAccount, {
      fields: [atcoderAccountStats.accountId],
      references: [userOjAccount.id],
    }),
  })
);
