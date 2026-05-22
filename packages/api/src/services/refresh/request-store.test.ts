import { afterEach, describe, expect, it } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { refreshRequest } from "@hhuacm-dashboard/db/schema/refresh-request";
import { createClient } from "@libsql/client";
import { asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";

import type { Context } from "../../context";
import {
  createRefreshRequest,
  deleteRefreshRequest,
  getNextRefreshRequest,
} from "./request-store";
import {
  codeforcesAccountStatsRequestKind,
  luoguAccountStatsRequestKind,
} from "./request-types";

const createRefreshRequestTableSql = `
create table refresh_request (
	  kind text not null,
	  target_id text not null,
	  created_at integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null,
    primary key (kind, target_id)
	)
	`;

const createTestDb = async () => {
  const directory = await mkdtemp(
    path.join(tmpdir(), "refresh-request-store-")
  );
  const client = createClient({
    url: `file:${path.join(directory, "test.db")}`,
  });

  await client.execute(createRefreshRequestTableSql);
  await client.execute(
    "create index refresh_request_created_at_idx on refresh_request (created_at)"
  );

  return {
    db: drizzle({
      client,
      schema: { refreshRequest },
    }) as unknown as Context["db"],
    directory,
  };
};

let testDirectory: null | string = null;

afterEach(async () => {
  if (testDirectory) {
    await rm(testDirectory, { force: true, recursive: true });
    testDirectory = null;
  }
});

const createTestRequest = (db: Context["db"], targetId = "account-1") =>
  createRefreshRequest(db, {
    kind: codeforcesAccountStatsRequestKind,
    targetId,
  });

const listRequests = (db: Context["db"], targetId: string) =>
  db
    .select()
    .from(refreshRequest)
    .where(eq(refreshRequest.targetId, targetId))
    .orderBy(asc(refreshRequest.createdAt));

describe("refresh request store", () => {
  it("keeps one request for a target and kind", async () => {
    const { db, directory } = await createTestDb();
    testDirectory = directory;

    const firstRequest = await createTestRequest(db);
    const secondRequest = await createRefreshRequest(db, {
      kind: codeforcesAccountStatsRequestKind,
      targetId: "account-1",
    });
    const requests = await listRequests(db, "account-1");

    expect(secondRequest).toEqual(firstRequest);
    expect(requests).toHaveLength(1);
  });

  it("keeps separate requests for separate kinds", async () => {
    const { db, directory } = await createTestDb();
    testDirectory = directory;

    await createTestRequest(db);
    await createRefreshRequest(db, {
      kind: luoguAccountStatsRequestKind,
      targetId: "account-1",
    });
    const requests = await listRequests(db, "account-1");

    expect(requests.map((request) => request.kind).sort()).toEqual([
      "codeforces.accountStats",
      "luogu.accountStats",
    ]);
  });

  it("takes requests by creation order", async () => {
    const { db, directory } = await createTestDb();
    testDirectory = directory;

    await createRefreshRequest(db, {
      kind: codeforcesAccountStatsRequestKind,
      targetId: "first",
    });
    await createRefreshRequest(db, {
      kind: codeforcesAccountStatsRequestKind,
      targetId: "second",
    });

    const request = await getNextRefreshRequest(db);

    expect(request?.targetId).toBe("first");
  });

  it("deletes requests by kind and target", async () => {
    const { db, directory } = await createTestDb();
    testDirectory = directory;

    await createTestRequest(db, "account-1");
    await createTestRequest(db, "account-1");
    await createTestRequest(db, "account-2");

    await deleteRefreshRequest(db, {
      kind: codeforcesAccountStatsRequestKind,
      targetId: "account-1",
    });

    const remainingRequests = await db.select().from(refreshRequest);

    expect(remainingRequests).toHaveLength(1);
    expect(remainingRequests[0]?.targetId).toBe("account-2");
  });
});
