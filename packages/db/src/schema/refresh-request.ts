import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const refreshRequestKinds = [
  "atcoder.accountStats",
  "codeforces.accountStats",
  "luogu.accountStats",
  "luogu.problemDetails",
  "nowcoder.accountStats",
  "user.awardsFromLuogu",
] as const;

export const refreshRequest = sqliteTable(
  "refresh_request",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    kind: text("kind", { enum: refreshRequestKinds }).notNull(),
    targetId: text("target_id").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("refresh_request_kind_target_unique").on(
      table.kind,
      table.targetId
    ),
    index("refresh_request_created_at_idx").on(table.createdAt),
  ]
);

export const refreshRequestRelations = relations(refreshRequest, () => ({}));
