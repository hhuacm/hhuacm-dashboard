import { sql } from "drizzle-orm";
import { sqliteView, text } from "drizzle-orm/sqlite-core";

import { user } from "./auth";
import { userProfile } from "./profile";

export const currentMember = sqliteView("current_member", {
  grade: text("grade"),
  major: text("major"),
  realName: text("real_name"),
  studentId: text("student_id"),
  userId: text("user_id").notNull(),
  username: text("username"),
}).as(sql`
  select
    ${user.id} as user_id,
    ${user.username} as username,
    ${userProfile.realName} as real_name,
    ${userProfile.grade} as grade,
    ${userProfile.studentId} as student_id,
    ${userProfile.major} as major
  from ${user}
  left join ${userProfile} on ${userProfile.userId} = ${user.id}
  where coalesce(${userProfile.memberStatus}, 'selection') in ('selection', 'active')
`);
