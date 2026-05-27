import type { Database } from "@hhuacm-dashboard/db";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import { eq } from "drizzle-orm";
import { ApplicationError } from "../errors";

export const getCurrentUser = async (db: Database, userId: string) => {
  const [currentUser] = await db
    .select({
      email: user.email,
      id: user.id,
      role: user.role,
      username: user.username,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!currentUser) {
    throw new ApplicationError({ code: "NOT_FOUND" });
  }

  return currentUser;
};
