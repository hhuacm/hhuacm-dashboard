import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { asc, eq } from "drizzle-orm";

import { ojAccountFields } from "../oj-account/queries";
import { getTargetUser } from "../profile";
import type { Database } from "./types";

export const getAdminUser = async (db: Database, userId: string) => {
  const targetUser = await getTargetUser(db, userId);
  const ojAccounts = await db
    .select(ojAccountFields)
    .from(userOjAccount)
    .where(eq(userOjAccount.userId, userId))
    .orderBy(asc(userOjAccount.platform));

  return {
    email: targetUser.email,
    id: targetUser.id,
    ojAccounts,
    profile: {
      grade: targetUser.grade,
      major: targetUser.major,
      memberStatus: targetUser.memberStatus,
      realName: targetUser.realName,
      studentId: targetUser.studentId,
    },
    role: targetUser.role,
    username: targetUser.username,
  };
};
