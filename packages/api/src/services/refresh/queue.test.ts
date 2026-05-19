import { afterEach, describe, expect, it } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { refreshJob } from "@hhuacm-dashboard/db/schema/refresh-job";
import { createClient } from "@libsql/client";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";

import type { Context } from "../../context";
import {
  codeforcesAccountStatsJobKind,
  luoguAccountStatsJobKind,
  ojAccountTargetType,
} from "./constants";
import {
  deleteRefreshJob,
  deleteRefreshJobsForTarget,
  enqueueRefreshJob,
  getRefreshJobsForTarget,
  resetRunningRefreshJobs,
  takeNextRefreshJob,
} from "./queue";

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
  const directory = await mkdtemp(path.join(tmpdir(), "refresh-queue-"));
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
    targetType: ojAccountTargetType,
  });

describe("refresh queue", () => {
  it("keeps one active job for a target", async () => {
    const { db, directory } = await createTestDb();
    testDirectory = directory;

    const firstJob = await createJob(db);
    const secondJob = await enqueueRefreshJob(db, {
      kind: codeforcesAccountStatsJobKind,
      targetId: "account-1",
      targetType: ojAccountTargetType,
    });
    const jobs = await getRefreshJobsForTarget(db, { targetId: "account-1" });

    expect(firstJob?.status).toBe("pending");
    expect(secondJob?.status).toBe("pending");
    expect(secondJob?.id).toBe(firstJob?.id);
    expect(jobs).toHaveLength(1);
  });

  it("keeps separate active jobs for separate kinds", async () => {
    const { db, directory } = await createTestDb();
    testDirectory = directory;

    await createJob(db);
    await enqueueRefreshJob(db, {
      kind: luoguAccountStatsJobKind,
      targetId: "account-1",
      targetType: ojAccountTargetType,
    });
    const jobs = await getRefreshJobsForTarget(db, { targetId: "account-1" });

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
      targetType: ojAccountTargetType,
    });
    await enqueueRefreshJob(db, {
      kind: codeforcesAccountStatsJobKind,
      targetId: "second",
      targetType: ojAccountTargetType,
    });

    const claimedJob = await takeNextRefreshJob(db);

    expect(claimedJob?.targetId).toBe("first");
    expect(claimedJob?.status).toBe("running");
  });

  it("resets interrupted running jobs", async () => {
    const { db, directory } = await createTestDb();
    testDirectory = directory;

    await createJob(db);
    await takeNextRefreshJob(db);

    const recoveredCount = await resetRunningRefreshJobs(db);
    const jobs = await getRefreshJobsForTarget(db, { targetId: "account-1" });

    expect(recoveredCount).toBe(1);
    expect(jobs[0]?.status).toBe("pending");
  });

  it("deletes completed jobs", async () => {
    const { db, directory } = await createTestDb();
    testDirectory = directory;
    const job = await createJob(db);

    if (!job) {
      throw new Error("Expected created job");
    }

    await deleteRefreshJob(db, job.id);

    const [deletedJob] = await db
      .select()
      .from(refreshJob)
      .where(eq(refreshJob.id, job.id));

    expect(deletedJob).toBeUndefined();
  });

  it("deletes matching target jobs", async () => {
    const { db, directory } = await createTestDb();
    testDirectory = directory;

    await createJob(db, "account-1");
    await createJob(db, "account-1");
    await createJob(db, "account-2");

    await deleteRefreshJobsForTarget(db, {
      kind: codeforcesAccountStatsJobKind,
      targetId: "account-1",
      targetType: ojAccountTargetType,
    });

    const remainingJobs = await db.select().from(refreshJob);

    expect(remainingJobs).toHaveLength(1);
    expect(remainingJobs[0]?.targetId).toBe("account-2");
  });
});
