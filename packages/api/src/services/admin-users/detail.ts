import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { userProfile } from "@hhuacm-dashboard/db/schema/profile";
import { defaultMemberStatus } from "@hhuacm-dashboard/domain";
import { asc, eq } from "drizzle-orm";

import { ojAccountFields } from "../oj-account/queries";
import { getTargetUser, profileFields } from "../profile";
import type { Database } from "./types";

export const getAdminUser = async (db: Database, userId: string) => {
  const targetUser = await getTargetUser(db, userId);
  const [profile] = await db
    .select(profileFields)
    .from(userProfile)
    .where(eq(userProfile.userId, userId))
    .limit(1);
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
      grade: profile?.grade ?? null,
      major: profile?.major ?? null,
      memberStatus: profile?.memberStatus ?? defaultMemberStatus,
      realName: profile?.realName ?? null,
      studentId: profile?.studentId ?? null,
    },
    role: targetUser.role,
    username: targetUser.username,
  };
};
