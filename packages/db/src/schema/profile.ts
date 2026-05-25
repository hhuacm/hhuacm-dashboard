import { defaultMemberStatus, memberStatuses } from "@hhuacm-dashboard/domain";
import { relations } from "drizzle-orm";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

import { user } from "./auth";

export const userProfile = sqliteTable("user_profile", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  realName: text("real_name"),
  grade: text("grade"),
  studentId: text("student_id"),
  major: text("major"),
  memberStatus: text("member_status", { enum: memberStatuses })
    .default(defaultMemberStatus)
    .notNull(),
});

export const userProfileRelations = relations(userProfile, ({ one }) => ({
  user: one(user, {
    fields: [userProfile.userId],
    references: [user.id],
  }),
}));
