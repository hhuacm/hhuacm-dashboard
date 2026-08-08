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
        grade: "24级",
        major: "计算机科学与技术",
        name: "张三",
        password: "password123",
        studentId: "20240001",
        username: "first",
      },
    });
    await auth.api.signUpEmail({
      body: {
        email: "second@example.com",
        grade: "23级",
        major: "软件工程",
        name: "李四",
        password: "password123",
        studentId: "20230001",
        username: "second",
      },
    });

    const db = createDb();
    const users = await db
      .select({
        grade: user.grade,
        major: user.major,
        name: user.name,
        role: user.role,
        studentId: user.studentId,
        username: user.username,
      })
      .from(user)
      .orderBy(asc(user.username));

    expect(users).toEqual([
      {
        grade: "24级",
        major: "计算机科学与技术",
        name: "张三",
        role: "admin",
        studentId: "20240001",
        username: "first",
      },
      {
        grade: "23级",
        major: "软件工程",
        name: "李四",
        role: "user",
        studentId: "20230001",
        username: "second",
      },
    ]);
  });
});
