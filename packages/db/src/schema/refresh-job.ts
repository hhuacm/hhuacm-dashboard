import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const refreshJobKinds = [
  "codeforces.accountStats",
  "luogu.accountStats",
  "user.awardsFromLuogu",
] as const;
export const refreshJobTargetTypes = ["ojAccount"] as const;
export const refreshJobStatuses = ["pending", "running"] as const;

export const refreshJob = sqliteTable(
  "refresh_job",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    kind: text("kind", { enum: refreshJobKinds }).notNull(),
    targetType: text("target_type", { enum: refreshJobTargetTypes }).notNull(),
    targetId: text("target_id").notNull(),
    status: text("status", { enum: refreshJobStatuses })
      .default("pending")
      .notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("refresh_job_status_created_at_idx").on(
      table.status,
      table.createdAt
    ),
  ]
);

export const refreshJobRelations = relations(refreshJob, () => ({}));
