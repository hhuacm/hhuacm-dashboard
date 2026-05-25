import { user, type userRoles } from "@hhuacm-dashboard/db/schema/auth";
import { eq } from "drizzle-orm";

import type { Context } from "../context";

type Database = Context["db"];

export type SystemUserRole = (typeof userRoles)[number];

export interface SetUserRoleByUsernameResult {
  changed: boolean;
  email: string;
  newRole: SystemUserRole;
  oldRole: SystemUserRole;
  username: string;
}

export class SystemUserNotFoundError extends Error {
  constructor(username: string) {
    super(`User not found: ${username}`);
    this.name = "SystemUserNotFoundError";
  }
}

const userRoleFields = {
  email: user.email,
  id: user.id,
  role: user.role,
  username: user.username,
} as const;

export const setUserRoleByUsername = async (
  db: Database,
  input: {
    role: SystemUserRole;
    username: string;
  }
): Promise<SetUserRoleByUsernameResult> => {
  const [targetUser] = await db
    .select(userRoleFields)
    .from(user)
    .where(eq(user.username, input.username))
    .limit(1);

  if (!targetUser) {
    throw new SystemUserNotFoundError(input.username);
  }

  if (targetUser.role === input.role) {
    return {
      changed: false,
      email: targetUser.email,
      newRole: targetUser.role,
      oldRole: targetUser.role,
      username: targetUser.username,
    };
  }

  const [updatedUser] = await db
    .update(user)
    .set({ role: input.role })
    .where(eq(user.id, targetUser.id))
    .returning(userRoleFields);

  if (!updatedUser) {
    throw new SystemUserNotFoundError(input.username);
  }

  return {
    changed: true,
    email: updatedUser.email,
    newRole: updatedUser.role,
    oldRole: targetUser.role,
    username: updatedUser.username,
  };
};
