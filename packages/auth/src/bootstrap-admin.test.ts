import { afterEach, describe, expect, it } from "bun:test";
import type { Database } from "@hhuacm-dashboard/db";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import { siteSetting } from "@hhuacm-dashboard/db/schema/site-setting";
import { createTestDb } from "@hhuacm-dashboard/db/testing";
import { eq } from "drizzle-orm";
import {
  bootstrapAdminUserIdSettingKey,
  ensureFirstUserIsAdmin,
} from "./bootstrap-admin";

const cleanupTestDbs: Array<() => Promise<void>> = [];

afterEach(async () => {
  for (const cleanup of cleanupTestDbs.splice(0).reverse()) {
    await cleanup();
  }
});

const createAuthTestDb = async () => {
  const testDb = await createTestDb();
  cleanupTestDbs.push(testDb.cleanup);

  return testDb.db as Database;
};

const createUser = async (
  db: Awaited<ReturnType<typeof createAuthTestDb>>,
  input: {
    createdAt?: Date;
    id: string;
    username: string;
  }
) => {
  const timestamp = input.createdAt ?? new Date();

  await db.insert(user).values({
    createdAt: timestamp,
    email: `${input.username}@example.com`,
    emailVerified: false,
    id: input.id,
    name: input.username,
    updatedAt: timestamp,
    username: input.username,
  });
};

const readUserRole = async (
  db: Awaited<ReturnType<typeof createAuthTestDb>>,
  userId: string
) => {
  const [row] = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return row?.role;
};

describe("bootstrap admin", () => {
  it("grants admin to the first created user", async () => {
    const db = await createAuthTestDb();

    await createUser(db, { id: "first", username: "first" });
    const result = await ensureFirstUserIsAdmin(db, { userId: "first" });

    const [setting] = await db
      .select({ value: siteSetting.value })
      .from(siteSetting)
      .where(eq(siteSetting.key, bootstrapAdminUserIdSettingKey))
      .limit(1);

    expect(result).toEqual({ granted: true });
    expect(await readUserRole(db, "first")).toBe("admin");
    expect(setting?.value).toBe("first");
  });

  it("keeps later users as regular users", async () => {
    const db = await createAuthTestDb();

    await createUser(db, {
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      id: "first",
      username: "first",
    });
    await createUser(db, {
      createdAt: new Date("2026-01-01T00:00:01.000Z"),
      id: "second",
      username: "second",
    });

    const result = await ensureFirstUserIsAdmin(db, { userId: "second" });

    expect(result).toEqual({ granted: false });
    expect(await readUserRole(db, "second")).toBe("user");
  });

  it("only grants bootstrap admin once", async () => {
    const db = await createAuthTestDb();

    await createUser(db, { id: "first", username: "first" });

    expect(await ensureFirstUserIsAdmin(db, { userId: "first" })).toEqual({
      granted: true,
    });
    expect(await ensureFirstUserIsAdmin(db, { userId: "first" })).toEqual({
      granted: false,
    });
    expect(await readUserRole(db, "first")).toBe("admin");
  });
});
