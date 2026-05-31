import type { Database } from "@hhuacm-dashboard/db";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import { siteSetting } from "@hhuacm-dashboard/db/schema/site-setting";
import { asc, eq } from "drizzle-orm";

export const bootstrapAdminUserIdSettingKey = "bootstrap_admin_user_id";

export const ensureFirstUserIsAdmin = async (
  db: Database,
  input: { userId: string }
) =>
  await db.transaction(async (tx) => {
    const [firstUser] = await tx
      .select({ id: user.id })
      .from(user)
      .orderBy(asc(user.createdAt), asc(user.id))
      .limit(1);

    if (firstUser?.id !== input.userId) {
      return { granted: false };
    }

    const [bootstrapSetting] = await tx
      .insert(siteSetting)
      .values({
        key: bootstrapAdminUserIdSettingKey,
        value: input.userId,
      })
      .onConflictDoNothing()
      .returning({ value: siteSetting.value });

    if (!bootstrapSetting) {
      return { granted: false };
    }

    const [updatedUser] = await tx
      .update(user)
      .set({ role: "admin" })
      .where(eq(user.id, input.userId))
      .returning({ role: user.role });

    return { granted: updatedUser?.role === "admin" };
  });
