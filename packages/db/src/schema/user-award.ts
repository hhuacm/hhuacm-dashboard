import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

import { user } from "./auth";

export const userAwardSources = ["luogu"] as const;

export const userAward = sqliteTable(
  "user_award",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    source: text("source", { enum: userAwardSources }).notNull(),
    sourceHandle: text("source_handle").notNull(),
    sourceProfileUrl: text("source_profile_url").notNull(),
    year: integer("year").notNull(),
    contest: text("contest").notNull(),
    event: text("event"),
    level: text("level").notNull(),
    sortOrder: integer("sort_order").notNull(),
    fetchedAt: integer("fetched_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("user_award_user_source_sort_idx").on(
      table.userId,
      table.source,
      table.sortOrder
    ),
  ]
);

export const userAwardSync = sqliteTable(
  "user_award_sync",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    source: text("source", { enum: userAwardSources }).notNull(),
    fetchedAt: integer("fetched_at", { mode: "timestamp_ms" }),
    lastAttemptedAt: integer("last_attempted_at", {
      mode: "timestamp_ms",
    }).notNull(),
    lastError: text("last_error"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.userId, table.source],
      name: "user_award_sync_user_source_pk",
    }),
    index("user_award_sync_fetched_at_idx").on(table.fetchedAt),
  ]
);

export const userAwardRelations = relations(userAward, ({ one }) => ({
  user: one(user, {
    fields: [userAward.userId],
    references: [user.id],
  }),
}));

export const userAwardSyncRelations = relations(userAwardSync, ({ one }) => ({
  user: one(user, {
    fields: [userAwardSync.userId],
    references: [user.id],
  }),
}));
