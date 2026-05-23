import { user } from "@hhuacm-dashboard/db/schema/auth";
import { userProfile } from "@hhuacm-dashboard/db/schema/profile";
import { defaultMemberStatus } from "@hhuacm-dashboard/domain";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { clearCodeforcesStatsForUserAccounts } from "../oj-account/stats-effects";
import { getTargetUser } from "../profile";
import type { Database } from "./types";

const getUserMemberStatus = async (db: Database, userId: string) => {
  const [profile] = await db
    .select({ memberStatus: userProfile.memberStatus })
    .from(userProfile)
    .where(eq(userProfile.userId, userId))
    .limit(1);

  return profile?.memberStatus ?? defaultMemberStatus;
};

const assertAdminUserCanBeDeleted = async (
  db: Database,
  input: { userId: string; usernameConfirmation: string }
) => {
  const targetUser = await getTargetUser(db, input.userId);

  if (targetUser.role === "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin users cannot be deleted from the admin panel",
    });
  }

  const targetMemberStatus = await getUserMemberStatus(db, input.userId);

  if (targetMemberStatus !== "frozen") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only frozen users can be deleted from the admin panel",
    });
  }

  if (input.usernameConfirmation !== targetUser.username) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Username confirmation does not match",
    });
  }

  return targetUser;
};

const clearStatsBeforeDeletingAdminUser = async (
  db: Database,
  userId: string
) => {
  await clearCodeforcesStatsForUserAccounts(db, userId);
};

export const deleteAdminUser = async (
  db: Database,
  input: { userId: string; usernameConfirmation: string }
) => {
  await assertAdminUserCanBeDeleted(db, input);
  await clearStatsBeforeDeletingAdminUser(db, input.userId);

  const [deletedUser] = await db
    .delete(user)
    .where(eq(user.id, input.userId))
    .returning({
      email: user.email,
      id: user.id,
      role: user.role,
      username: user.username,
    });

  if (!deletedUser) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }

  return deletedUser;
};
