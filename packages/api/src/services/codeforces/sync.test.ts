import { describe, expect, it } from "bun:test";
import { codeforcesAccountStats } from "@hhuacm-dashboard/db/schema/codeforces-account-stats";
import { createClient } from "@libsql/client";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";

import type { Context } from "../../context";
import { markCodeforcesAccountStatsRefreshFailed } from "./sync";

const createCodeforcesStatsTableSql = `
create table codeforces_account_stats (
  account_id text primary key not null,
  rating integer,
  max_rating integer,
  accepted_problem_count integer,
  accepted_problem_count_in_month integer,
  last_online_at integer,
  fetched_at integer,
  last_attempted_at integer not null,
  last_error text
)
`;

const createTestDb = async () => {
  const client = createClient({ url: ":memory:" });

  await client.execute(createCodeforcesStatsTableSql);

  return drizzle({
    client,
    schema: { codeforcesAccountStats },
  }) as unknown as Context["db"];
};

describe("Codeforces sync failure recording", () => {
  it("upserts last error and attempted time", async () => {
    const db = await createTestDb();
    const now = new Date("2026-01-01T00:00:00.000Z");

    await markCodeforcesAccountStatsRefreshFailed(
      db,
      { handle: "forlight", id: "account-1" },
      new Error("network failed"),
      now
    );

    const [stats] = await db
      .select()
      .from(codeforcesAccountStats)
      .where(eq(codeforcesAccountStats.accountId, "account-1"));

    expect(stats?.lastAttemptedAt?.toISOString()).toBe(now.toISOString());
    expect(stats?.lastError).toBe("network failed");
  });
});
