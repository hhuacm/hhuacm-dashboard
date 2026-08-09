import { afterEach, describe, expect, it } from "bun:test";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import { createTestDb } from "@hhuacm-dashboard/db/testing";
import { eq } from "drizzle-orm";
import { ensureFirstUserIsAdmin } from "./bootstrap-admin";

const cleanupTestDbs: Array<() => Promise<void>> = [];

afterEach(async () => {
  for (const cleanup of cleanupTestDbs.splice(0).reverse()) {
    await cleanup();
  }
});

describe("bootstrap admin", () => {
  it("only grants bootstrap admin once", async () => {
    const testDb = await createTestDb();
    cleanupTestDbs.push(testDb.cleanup);
    const timestamp = new Date();

    await testDb.db.insert(user).values({
      createdAt: timestamp,
      email: "first@example.com",
      emailVerified: false,
      id: "first",
      name: "first",
      updatedAt: timestamp,
      username: "first",
    });

    expect(
      await ensureFirstUserIsAdmin(testDb.db, { userId: "first" })
    ).toEqual({ granted: true });
    expect(
      await ensureFirstUserIsAdmin(testDb.db, { userId: "first" })
    ).toEqual({ granted: false });

    const [firstUser] = await testDb.db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, "first"))
      .limit(1);

    expect(firstUser?.role).toBe("admin");
  });
});
