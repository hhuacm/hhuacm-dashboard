import { afterEach, describe, expect, it } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { refreshJob } from "@hhuacm-dashboard/db/schema/refresh-job";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import type { Context } from "../../context";
import {
  codeforcesAccountStatsJobKind,
  ojAccountTargetType,
} from "./constants";
import { enqueueRefreshJob, takeNextRefreshJob } from "./queue";
import {
  type RefreshJobDefinition,
  recoverInterruptedRefreshJobs,
  runRefreshWorkerOnce,
  scanStaleRefreshTargets,
} from "./runtime";

const fakeDb = null as unknown as Context["db"];

const createRefreshJobTableSql = `
create table refresh_job (
	  id text primary key not null,
	  kind text not null,
	  target_type text not null,
	  target_id text not null,
	  status text default 'pending' not null,
	  created_at integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null
	)
	`;

const createTestDb = async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "refresh-runtime-"));
  const client = createClient({
    url: `file:${path.join(directory, "test.db")}`,
  });

  await client.execute(createRefreshJobTableSql);
  await client.execute(
    "create index refresh_job_status_created_at_idx on refresh_job (status, created_at)"
  );

  return {
    db: drizzle({ client, schema: { refreshJob } }) as unknown as Context["db"],
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

const enqueueTestJob = (db: Context["db"]) =>
  enqueueRefreshJob(db, {
    kind: codeforcesAccountStatsJobKind,
    targetId: "account-1",
    targetType: ojAccountTargetType,
  });

describe("refresh runtime", () => {
  it("runs stale scans across definitions", async () => {
    const definitions = [
      {
        cooldownMs: 0,
        handle: () => Promise.resolve(),
        kind: codeforcesAccountStatsJobKind,
        scanStaleTargets: async () => 2,
      },
    ] satisfies RefreshJobDefinition[];

    await expect(scanStaleRefreshTargets(definitions, fakeDb)).resolves.toBe(2);
  });

  it("deletes jobs after successful handlers", async () => {
    const { db, directory } = await createTestDb();
    testDirectory = directory;
    await enqueueTestJob(db);
    const handledJobIds: string[] = [];
    const definitions = [
      {
        cooldownMs: 0,
        handle: (_db, job) => {
          handledJobIds.push(job.id);
          return Promise.resolve();
        },
        kind: codeforcesAccountStatsJobKind,
        scanStaleTargets: async () => 0,
      },
    ] satisfies RefreshJobDefinition[];

    const result = await runRefreshWorkerOnce(db, definitions);
    const remainingJobs = await db.select().from(refreshJob);

    expect(handledJobIds).toEqual(result ? [result.job.id] : []);
    expect(remainingJobs).toHaveLength(0);
  });

  it("requeues jobs after handlers request it", async () => {
    const { db, directory } = await createTestDb();
    testDirectory = directory;
    await enqueueTestJob(db);
    const definitions = [
      {
        cooldownMs: 0,
        handle: () => Promise.resolve({ requeue: true }),
        kind: codeforcesAccountStatsJobKind,
        scanStaleTargets: async () => 0,
      },
    ] satisfies RefreshJobDefinition[];

    const result = await runRefreshWorkerOnce(db, definitions);
    const remainingJobs = await db.select().from(refreshJob);

    expect(result?.job.targetId).toBe("account-1");
    expect(remainingJobs).toHaveLength(1);
    expect(remainingJobs[0]?.id).not.toBe(result?.job.id);
    expect(remainingJobs[0]?.status).toBe("pending");
    expect(remainingJobs[0]?.targetId).toBe("account-1");
  });

  it("deletes jobs after failed handlers", async () => {
    const { db, directory } = await createTestDb();
    testDirectory = directory;
    await enqueueTestJob(db);
    const definitions = [
      {
        cooldownMs: 0,
        handle: () => Promise.reject(new Error("network failed")),
        kind: codeforcesAccountStatsJobKind,
        scanStaleTargets: async () => 0,
      },
    ] satisfies RefreshJobDefinition[];

    await expect(runRefreshWorkerOnce(db, definitions)).rejects.toThrow(
      "network failed"
    );
    const remainingJobs = await db.select().from(refreshJob);

    expect(remainingJobs).toHaveLength(0);
  });

  it("recovers jobs left running by interrupted workers", async () => {
    const { db, directory } = await createTestDb();
    testDirectory = directory;
    await enqueueTestJob(db);
    await takeNextRefreshJob(db);

    await recoverInterruptedRefreshJobs(db);
    const [job] = await db.select().from(refreshJob);

    expect(job?.status).toBe("pending");
  });

  it("rejects unsupported job kinds", async () => {
    const { db, directory } = await createTestDb();
    testDirectory = directory;
    const job = await enqueueRefreshJob(db, {
      kind: codeforcesAccountStatsJobKind,
      targetId: "account-1",
      targetType: ojAccountTargetType,
    });

    if (!job) {
      throw new Error("Expected created job");
    }

    await expect(runRefreshWorkerOnce(db, [])).rejects.toThrow(
      "Unsupported refresh job kind: codeforces.accountStats"
    );
  });
});
