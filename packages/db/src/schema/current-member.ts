import {
  currentMemberStatuses,
  defaultMemberStatus,
} from "@hhuacm-dashboard/domain";
import { sql } from "drizzle-orm";
import { sqliteView, text } from "drizzle-orm/sqlite-core";

import { user } from "./auth";
import { userProfile } from "./profile";

const toSqlStringLiteral = (value: string) =>
  sql.raw(`'${value.replaceAll("'", "''")}'`);

const defaultMemberStatusSql = toSqlStringLiteral(defaultMemberStatus);
const currentMemberStatusesSql = sql.join(
  currentMemberStatuses.map(toSqlStringLiteral),
  sql`, `
);

export const currentMember = sqliteView("current_member", {
  grade: text("grade"),
  major: text("major"),
  memberStatus: text("member_status", {
    enum: currentMemberStatuses,
  }).notNull(),
  realName: text("real_name"),
  studentId: text("student_id"),
  userId: text("user_id").notNull(),
  username: text("username").notNull(),
}).as(sql`
  select
    ${user.id} as user_id,
    ${user.username} as username,
    ${userProfile.realName} as real_name,
    ${userProfile.grade} as grade,
    ${userProfile.studentId} as student_id,
    ${userProfile.major} as major,
    coalesce(${userProfile.memberStatus}, ${defaultMemberStatusSql}) as member_status
  from ${user}
  left join ${userProfile} on ${userProfile.userId} = ${user.id}
  where coalesce(${userProfile.memberStatus}, ${defaultMemberStatusSql}) in (${currentMemberStatusesSql})
`);
