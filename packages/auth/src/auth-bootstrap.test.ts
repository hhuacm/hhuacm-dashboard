import { afterEach, describe, expect, it } from "bun:test";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import { createTestDb } from "@hhuacm-dashboard/db/testing";
import { asc } from "drizzle-orm";

const cleanupTestDbs: Array<() => Promise<void>> = [];

afterEach(async () => {
  for (const cleanup of cleanupTestDbs.splice(0).reverse()) {
    await cleanup();
  }
});

const configureAuthEnv = (databaseUrl: string) => {
  process.env.DATABASE_URL = databaseUrl;
  process.env.DATABASE_AUTH_TOKEN = "";
  process.env.BETTER_AUTH_SECRET = "temporary-secret-for-auth-bootstrap-test";
  process.env.BETTER_AUTH_URL = "http://localhost:3000";
  process.env.CORS_ORIGIN = "http://localhost:3001";
  process.env.NODE_ENV = "test";
};

describe("auth bootstrap", () => {
  it("grants admin through the Better Auth sign-up hook", async () => {
    const testDb = await createTestDb();
    cleanupTestDbs.push(testDb.cleanup);
    configureAuthEnv(testDb.databaseUrl);

    const [{ createAuth }, { createDb }] = await Promise.all([
      import("./index"),
      import("@hhuacm-dashboard/db"),
    ]);
    const auth = createAuth();

    await auth.api.signUpEmail({
      body: {
        email: "first@example.com",
        name: "first",
        password: "password123",
        username: "first",
      },
    });
    await auth.api.signUpEmail({
      body: {
        email: "second@example.com",
        name: "second",
        password: "password123",
        username: "second",
      },
    });

    const db = createDb();
    const users = await db
      .select({ role: user.role, username: user.username })
      .from(user)
      .orderBy(asc(user.username));

    expect(users).toEqual([
      { role: "admin", username: "first" },
      { role: "user", username: "second" },
    ]);
  });
});
