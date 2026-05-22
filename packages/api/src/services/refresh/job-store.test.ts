import { afterEach, describe, expect, it } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { refreshJob } from "@hhuacm-dashboard/db/schema/refresh-job";
import { createClient } from "@libsql/client";
import { asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";

import type { Context } from "../../context";
import {
  claimNextPendingRefreshJob,
  deleteRefreshJob,
  enqueueRefreshJob,
  recoverRunningRefreshJobs,
} from "./job-store";
import {
  codeforcesAccountStatsJobKind,
  luoguAccountStatsJobKind,
} from "./job-types";

const createRefreshJobTableSql = `
create table refresh_job (
	  kind text not null,
	  target_id text not null,
	  status text default 'pending' not null,
	  created_at integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null,
    primary key (kind, target_id)
	)
	`;

const createTestDb = async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "refresh-job-store-"));
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

const createJob = (db: Context["db"], targetId = "account-1") =>
  enqueueRefreshJob(db, {
    kind: codeforcesAccountStatsJobKind,
    targetId,
  });

const listJobs = (db: Context["db"], targetId: string) =>
  db
    .select()
    .from(refreshJob)
    .where(eq(refreshJob.targetId, targetId))
    .orderBy(asc(refreshJob.createdAt));

describe("refresh job store", () => {
  it("keeps one active job for a target", async () => {
    const { db, directory } = await createTestDb();
    testDirectory = directory;

    const firstJob = await createJob(db);
    const secondJob = await enqueueRefreshJob(db, {
      kind: codeforcesAccountStatsJobKind,
      targetId: "account-1",
    });
    const jobs = await listJobs(db, "account-1");

    expect(firstJob?.status).toBe("pending");
    expect(secondJob?.status).toBe("pending");
    expect(secondJob).toEqual(firstJob);
    expect(jobs).toHaveLength(1);
  });

  it("keeps separate active jobs for separate kinds", async () => {
    const { db, directory } = await createTestDb();
    testDirectory = directory;

    await createJob(db);
    await enqueueRefreshJob(db, {
      kind: luoguAccountStatsJobKind,
      targetId: "account-1",
    });
    const jobs = await listJobs(db, "account-1");

    expect(jobs.map((job) => job.kind).sort()).toEqual([
      "codeforces.accountStats",
      "luogu.accountStats",
    ]);
  });

  it("takes pending jobs by creation order", async () => {
    const { db, directory } = await createTestDb();
    testDirectory = directory;

    await enqueueRefreshJob(db, {
      kind: codeforcesAccountStatsJobKind,
      targetId: "first",
    });
    await enqueueRefreshJob(db, {
      kind: codeforcesAccountStatsJobKind,
      targetId: "second",
    });

    const claimedJob = await claimNextPendingRefreshJob(db);

    expect(claimedJob?.targetId).toBe("first");
    expect(claimedJob?.status).toBe("running");
  });

  it("resets interrupted running jobs", async () => {
    const { db, directory } = await createTestDb();
    testDirectory = directory;

    await createJob(db);
    await claimNextPendingRefreshJob(db);

    const recoveredCount = await recoverRunningRefreshJobs(db);
    const jobs = await listJobs(db, "account-1");

    expect(recoveredCount).toBe(1);
    expect(jobs[0]?.status).toBe("pending");
  });

  it("deletes jobs by kind and target", async () => {
    const { db, directory } = await createTestDb();
    testDirectory = directory;

    await createJob(db, "account-1");
    await createJob(db, "account-1");
    await createJob(db, "account-2");

    await deleteRefreshJob(db, {
      kind: codeforcesAccountStatsJobKind,
      targetId: "account-1",
    });

    const remainingJobs = await db.select().from(refreshJob);

    expect(remainingJobs).toHaveLength(1);
    expect(remainingJobs[0]?.targetId).toBe("account-2");
  });
});
