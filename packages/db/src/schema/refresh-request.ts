import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const refreshRequestKinds = [
  "codeforces.accountStats",
  "luogu.accountStats",
  "luogu.problemDetails",
  "user.awardsFromLuogu",
] as const;

export const refreshRequest = sqliteTable(
  "refresh_request",
  {
    kind: text("kind", { enum: refreshRequestKinds }).notNull(),
    targetId: text("target_id").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.kind, table.targetId],
      name: "refresh_request_kind_target_pk",
    }),
    index("refresh_request_created_at_idx").on(table.createdAt),
  ]
);

export const refreshRequestRelations = relations(refreshRequest, () => ({}));
