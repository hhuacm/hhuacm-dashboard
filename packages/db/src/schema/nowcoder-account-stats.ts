import { relations } from "drizzle-orm";
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

import { userOjAccount } from "./oj-account";

export const nowcoderAccountStats = sqliteTable(
  "nowcoder_account_stats",
  {
    accountId: text("account_id")
      .primaryKey()
      .references(() => userOjAccount.id, { onDelete: "cascade" }),
    rating: real("rating"),
    acceptedProblemCount: integer("accepted_problem_count"),
    fetchedAt: integer("fetched_at", { mode: "timestamp_ms" }),
    lastAttemptedAt: integer("last_attempted_at", {
      mode: "timestamp_ms",
    }).notNull(),
    lastError: text("last_error"),
  },
  (table) => [
    index("nowcoder_account_stats_fetched_at_idx").on(table.fetchedAt),
  ]
);

export const nowcoderAccountStatsRelations = relations(
  nowcoderAccountStats,
  ({ one }) => ({
    account: one(userOjAccount, {
      fields: [nowcoderAccountStats.accountId],
      references: [userOjAccount.id],
    }),
  })
);
