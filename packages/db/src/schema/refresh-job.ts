import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const refreshJobKinds = [
  "codeforces.accountStats",
  "luogu.accountStats",
  "luogu.problemDetails",
  "user.awardsFromLuogu",
] as const;
export const refreshJobStatuses = ["pending", "running"] as const;

export const refreshJob = sqliteTable(
  "refresh_job",
  {
    kind: text("kind", { enum: refreshJobKinds }).notNull(),
    targetId: text("target_id").notNull(),
    status: text("status", { enum: refreshJobStatuses })
      .default("pending")
      .notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.kind, table.targetId],
      name: "refresh_job_kind_target_pk",
    }),
    index("refresh_job_status_created_at_idx").on(
      table.status,
      table.createdAt
    ),
  ]
);

export const refreshJobRelations = relations(refreshJob, () => ({}));
