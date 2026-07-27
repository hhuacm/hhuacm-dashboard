import type { DatabaseTransaction } from "@hhuacm-dashboard/db";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import { userProfile } from "@hhuacm-dashboard/db/schema/profile";
import { defaultMemberStatus } from "@hhuacm-dashboard/domain";
import { eq } from "drizzle-orm";
import { ApplicationError } from "../../errors";

import { clearOjAccountRefreshRequestsForUser } from "../oj-account/stats-effects";
import { getTargetUser } from "../profile";
import type { Database } from "./types";

type AdminUserDeleteDatabase = Database | DatabaseTransaction;

const getUserMemberStatus = async (
  db: AdminUserDeleteDatabase,
  userId: string
) => {
  const [profile] = await db
    .select({ memberStatus: userProfile.memberStatus })
    .from(userProfile)
    .where(eq(userProfile.userId, userId))
    .limit(1);

  return profile?.memberStatus ?? defaultMemberStatus;
};

const assertAdminUserCanBeDeleted = async (
  db: AdminUserDeleteDatabase,
  input: { userId: string; usernameConfirmation: string }
) => {
  const targetUser = await getTargetUser(db, input.userId);

  if (targetUser.role === "admin") {
    throw new ApplicationError({
      code: "FORBIDDEN",
      message: "Admin users cannot be deleted from the admin panel",
    });
  }

  const targetMemberStatus = await getUserMemberStatus(db, input.userId);

  if (targetMemberStatus !== "frozen") {
    throw new ApplicationError({
      code: "FORBIDDEN",
      message: "Only frozen users can be deleted from the admin panel",
    });
  }

  if (input.usernameConfirmation !== targetUser.username) {
    throw new ApplicationError({
      code: "BAD_REQUEST",
      message: "Username confirmation does not match",
    });
  }

  return targetUser;
};

export const deleteAdminUser = async (
  db: Database,
  input: { userId: string; usernameConfirmation: string }
) =>
  await db.transaction(async (tx) => {
    await assertAdminUserCanBeDeleted(tx, input);
    await clearOjAccountRefreshRequestsForUser(tx, input.userId);

    const [deletedUser] = await tx
      .delete(user)
      .where(eq(user.id, input.userId))
      .returning({
        email: user.email,
        id: user.id,
        role: user.role,
        username: user.username,
      });

    if (!deletedUser) {
      throw new ApplicationError({ code: "NOT_FOUND" });
    }

    return deletedUser;
  });
