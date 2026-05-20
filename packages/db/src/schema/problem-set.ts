import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const problemSet = sqliteTable("problem_set", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  descriptionMarkdown: text("description_markdown").default("").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const problemSetProblem = sqliteTable(
  "problem_set_problem",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    problemSetId: text("problem_set_id")
      .notNull()
      .references(() => problemSet.id, { onDelete: "cascade" }),
    pid: text("pid").notNull(),
    title: text("title").notNull(),
    difficulty: integer("difficulty"),
    sortOrder: integer("sort_order").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("problem_set_problem_set_pid_unique").on(
      table.problemSetId,
      table.pid
    ),
    index("problem_set_problem_set_sort_idx").on(
      table.problemSetId,
      table.sortOrder
    ),
    index("problem_set_problem_pid_set_idx").on(table.pid, table.problemSetId),
  ]
);

export const problemSetRelations = relations(problemSet, ({ many }) => ({
  problems: many(problemSetProblem),
}));

export const problemSetProblemRelations = relations(
  problemSetProblem,
  ({ one }) => ({
    problemSet: one(problemSet, {
      fields: [problemSetProblem.problemSetId],
      references: [problemSet.id],
    }),
  })
);
