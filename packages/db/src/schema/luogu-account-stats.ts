import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

import { userOjAccount } from "./oj-account";

export const luoguAccountStats = sqliteTable(
  "luogu_account_stats",
  {
    accountId: text("account_id")
      .primaryKey()
      .references(() => userOjAccount.id, { onDelete: "cascade" }),
    acceptedProblemCount: integer("accepted_problem_count"),
    acceptedWeightedScore: integer("accepted_weighted_score"),
    averageAcceptedDifficulty: real("average_accepted_difficulty"),
    fetchedAt: integer("fetched_at", { mode: "timestamp_ms" }),
    lastAttemptedAt: integer("last_attempted_at", {
      mode: "timestamp_ms",
    }).notNull(),
    lastError: text("last_error"),
    uid: integer("uid"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("luogu_account_stats_fetched_at_idx").on(table.fetchedAt)]
);

export const luoguAcceptedProblem = sqliteTable(
  "luogu_accepted_problem",
  {
    accountId: text("account_id")
      .notNull()
      .references(() => userOjAccount.id, { onDelete: "cascade" }),
    difficulty: integer("difficulty"),
    firstSeenAt: integer("first_seen_at", { mode: "timestamp_ms" }).notNull(),
    lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }).notNull(),
    name: text("name").notNull(),
    pid: text("pid").notNull(),
    type: text("type").notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.accountId, table.pid],
      name: "luogu_accepted_problem_account_pid_pk",
    }),
    index("luogu_accepted_problem_pid_account_idx").on(
      table.pid,
      table.accountId
    ),
  ]
);

export const luoguAccountStatsRelations = relations(
  luoguAccountStats,
  ({ one }) => ({
    account: one(userOjAccount, {
      fields: [luoguAccountStats.accountId],
      references: [userOjAccount.id],
    }),
  })
);

export const luoguAcceptedProblemRelations = relations(
  luoguAcceptedProblem,
  ({ one }) => ({
    account: one(userOjAccount, {
      fields: [luoguAcceptedProblem.accountId],
      references: [userOjAccount.id],
    }),
  })
);
