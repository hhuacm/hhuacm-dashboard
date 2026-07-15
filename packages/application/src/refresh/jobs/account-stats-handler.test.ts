import { describe, expect, it } from "bun:test";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { createServiceTestDb } from "../../services/test-db";
import { createAccountStatsRefreshHandler } from "./account-stats-handler";

const request = (targetId: string) => ({
  createdAt: new Date(),
  kind: "atcoder.accountStats" as const,
  targetId,
});

describe("account stats refresh handler", () => {
  it("records failures for matching accounts and rejects other platforms", async () => {
    const db = await createServiceTestDb();
    await db.insert(user).values({
      email: "user@example.com",
      id: "user",
      name: "user",
      username: "user",
    });
    await db.insert(userOjAccount).values({
      externalId: "tourist",
      handle: "tourist",
      id: "account",
      platform: "atcoder",
      userId: "user",
    });
    const syncError = new Error("sync failed");
    const failures: { accountId: string; error: unknown }[] = [];
    const handler = createAccountStatsRefreshHandler({
      markFailed: (_db, account, error) => {
        failures.push({ accountId: account.id, error });
        return Promise.resolve();
      },
      platform: "atcoder",
      sync: () => Promise.reject(syncError),
    });

    await handler(db, request("account"));

    expect(failures).toEqual([{ accountId: "account", error: syncError }]);

    const codeforcesHandler = createAccountStatsRefreshHandler({
      markFailed: () => Promise.resolve(),
      platform: "codeforces",
      sync: () => Promise.resolve(),
    });

    await expect(codeforcesHandler(db, request("account"))).rejects.toThrow(
      "Codeforces account does not exist: account"
    );
  });
});
