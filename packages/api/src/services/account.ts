import { user } from "@hhuacm-dashboard/db/schema/auth";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import type { Context } from "../context";

type Database = Context["db"];

export const getCurrentUser = async (db: Database, userId: string) => {
  const [currentUser] = await db
    .select({
      displayUsername: user.displayUsername,
      email: user.email,
      id: user.id,
      name: user.name,
      role: user.role,
      username: user.username,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!currentUser) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }

  return currentUser;
};
