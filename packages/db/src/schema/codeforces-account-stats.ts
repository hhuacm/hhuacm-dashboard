import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { userOjAccount } from "./oj-account";

export const codeforcesAccountStats = sqliteTable(
  "codeforces_account_stats",
  {
    accountId: text("account_id")
      .primaryKey()
      .references(() => userOjAccount.id, { onDelete: "cascade" }),
    rating: integer("rating"),
    maxRating: integer("max_rating"),
    acceptedProblemCount: integer("accepted_problem_count"),
    acceptedProblemCountInMonth: integer("accepted_problem_count_in_month"),
    lastOnlineAt: integer("last_online_at", { mode: "timestamp_ms" }),
    fetchedAt: integer("fetched_at", { mode: "timestamp_ms" }),
    lastAttemptedAt: integer("last_attempted_at", {
      mode: "timestamp_ms",
    }).notNull(),
    lastError: text("last_error"),
  },
  (table) => [
    index("codeforces_account_stats_fetched_at_idx").on(table.fetchedAt),
  ]
);

export const codeforcesAccountStatsRelations = relations(
  codeforcesAccountStats,
  ({ one }) => ({
    account: one(userOjAccount, {
      fields: [codeforcesAccountStats.accountId],
      references: [userOjAccount.id],
    }),
  })
);
