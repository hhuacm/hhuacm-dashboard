import { afterEach } from "bun:test";
import type { Database } from "@hhuacm-dashboard/db";
import { createTestDb } from "@hhuacm-dashboard/db/testing";

const cleanupTestDbs: Array<() => Promise<void>> = [];

afterEach(async () => {
  for (const cleanup of cleanupTestDbs.splice(0).reverse()) {
    await cleanup();
  }
});

export const createServiceTestDb = async () => {
  const testDb = await createTestDb();
  cleanupTestDbs.push(testDb.cleanup);

  return testDb.db as Database;
};
