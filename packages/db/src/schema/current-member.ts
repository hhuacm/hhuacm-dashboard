import { currentMemberStatuses } from "@hhuacm-dashboard/domain";
import { sql } from "drizzle-orm";
import { sqliteView, text } from "drizzle-orm/sqlite-core";

import { user } from "./auth";

const toSqlStringLiteral = (value: string) =>
  sql.raw(`'${value.replaceAll("'", "''")}'`);

const currentMemberStatusesSql = sql.join(
  currentMemberStatuses.map(toSqlStringLiteral),
  sql`, `
);

export const currentMember = sqliteView("current_member", {
  grade: text("grade").notNull(),
  major: text("major").notNull(),
  memberStatus: text("member_status", {
    enum: currentMemberStatuses,
  }).notNull(),
  realName: text("real_name").notNull(),
  studentId: text("student_id").notNull(),
  userId: text("user_id").notNull(),
  username: text("username").notNull(),
}).as(sql`
  select
    ${user.id} as user_id,
    ${user.username} as username,
    ${user.name} as real_name,
    ${user.grade} as grade,
    ${user.studentId} as student_id,
    ${user.major} as major,
    ${user.memberStatus} as member_status
  from ${user}
  where ${user.memberStatus} in (${currentMemberStatusesSql})
`);
