import { ojPlatforms } from "@hhuacm-dashboard/domain";
import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { user } from "./auth";

export const userOjAccount = sqliteTable(
  "user_oj_account",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    platform: text("platform", { enum: ojPlatforms }).notNull(),
    externalId: text("external_id").notNull(),
    handle: text("handle").notNull(),
  },
  (table) => [
    check(
      "user_oj_account_platform_check",
      sql`${table.platform} in ('luogu', 'codeforces', 'atcoder', 'nowcoder')`
    ),
    uniqueIndex("user_oj_account_user_platform_unique").on(
      table.userId,
      table.platform
    ),
    uniqueIndex("user_oj_account_platform_external_id_unique").on(
      table.platform,
      table.externalId
    ),
    index("user_oj_account_platform_userId_idx").on(
      table.platform,
      table.userId
    ),
  ]
);

export const userOjAccountRelations = relations(userOjAccount, ({ one }) => ({
  user: one(user, {
    fields: [userOjAccount.userId],
    references: [user.id],
  }),
}));
