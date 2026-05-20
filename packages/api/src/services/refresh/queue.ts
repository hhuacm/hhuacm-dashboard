import { refreshJob } from "@hhuacm-dashboard/db/schema/refresh-job";
import { and, asc, eq, or } from "drizzle-orm";

import type { Context } from "../../context";
import {
  codeforcesAccountStatsJobKind,
  luoguAccountStatsJobKind,
  luoguProblemDetailsJobKind,
  luoguProblemTargetType,
  ojAccountTargetType,
  type RefreshJobKind,
  type RefreshJobTargetType,
  userAwardsFromLuoguJobKind,
} from "./constants";

type Database = Context["db"];

const refreshJobFields = {
  createdAt: refreshJob.createdAt,
  id: refreshJob.id,
  kind: refreshJob.kind,
  status: refreshJob.status,
  targetId: refreshJob.targetId,
  targetType: refreshJob.targetType,
} as const;

export type RefreshJob = NonNullable<
  Awaited<ReturnType<typeof getRefreshJobById>>
>;

export const getRefreshJobById = async (db: Database, jobId: string) =>
  (
    await db
      .select(refreshJobFields)
      .from(refreshJob)
      .where(eq(refreshJob.id, jobId))
      .limit(1)
  )[0] ?? null;

export const enqueueRefreshJob = async (
  db: Database,
  input: {
    kind: RefreshJobKind;
    targetId: string;
    targetType: RefreshJobTargetType;
  }
) => {
  const [existingJob] = await db
    .select(refreshJobFields)
    .from(refreshJob)
    .where(
      and(
        eq(refreshJob.kind, input.kind),
        eq(refreshJob.targetId, input.targetId),
        eq(refreshJob.targetType, input.targetType),
        or(eq(refreshJob.status, "pending"), eq(refreshJob.status, "running"))
      )
    )
    .limit(1);

  if (existingJob) {
    return existingJob;
  }

  const [job] = await db
    .insert(refreshJob)
    .values({
      kind: input.kind,
      status: "pending",
      targetId: input.targetId,
      targetType: input.targetType,
    })
    .returning(refreshJobFields);

  return job ?? null;
};

export const enqueueCodeforcesAccountStatsRefresh = (
  db: Database,
  accountId: string
) =>
  enqueueRefreshJob(db, {
    kind: codeforcesAccountStatsJobKind,
    targetId: accountId,
    targetType: ojAccountTargetType,
  });

export const enqueueLuoguAccountStatsRefresh = (
  db: Database,
  accountId: string
) =>
  enqueueRefreshJob(db, {
    kind: luoguAccountStatsJobKind,
    targetId: accountId,
    targetType: ojAccountTargetType,
  });

export const enqueueLuoguProblemDetailsRefresh = (db: Database, pid: string) =>
  enqueueRefreshJob(db, {
    kind: luoguProblemDetailsJobKind,
    targetId: pid,
    targetType: luoguProblemTargetType,
  });

export const getRefreshJobForCodeforcesAccount = (
  db: Database,
  accountId: string
) =>
  getRefreshJobsForTarget(db, {
    kind: codeforcesAccountStatsJobKind,
    targetId: accountId,
    targetType: ojAccountTargetType,
  });

export const getRefreshJobForLuoguAccount = (db: Database, accountId: string) =>
  getRefreshJobsForTarget(db, {
    kind: luoguAccountStatsJobKind,
    targetId: accountId,
    targetType: ojAccountTargetType,
  });

export const enqueueUserAwardsFromLuoguRefresh = (
  db: Database,
  accountId: string
) =>
  enqueueRefreshJob(db, {
    kind: userAwardsFromLuoguJobKind,
    targetId: accountId,
    targetType: ojAccountTargetType,
  });

export const getRefreshJobForUserAwardsFromLuogu = (
  db: Database,
  accountId: string
) =>
  getRefreshJobsForTarget(db, {
    kind: userAwardsFromLuoguJobKind,
    targetId: accountId,
    targetType: ojAccountTargetType,
  });

export const takeNextRefreshJob = async (db: Database) => {
  const [candidate] = await db
    .select({ id: refreshJob.id })
    .from(refreshJob)
    .where(eq(refreshJob.status, "pending"))
    .orderBy(asc(refreshJob.createdAt))
    .limit(1);

  if (!candidate) {
    return null;
  }

  const [claimedJob] = await db
    .update(refreshJob)
    .set({
      status: "running",
    })
    .where(
      and(eq(refreshJob.id, candidate.id), eq(refreshJob.status, "pending"))
    )
    .returning(refreshJobFields);

  return claimedJob ?? null;
};

export const resetRunningRefreshJobs = async (db: Database) => {
  const recoveredJobs = await db
    .update(refreshJob)
    .set({
      status: "pending",
    })
    .where(eq(refreshJob.status, "running"))
    .returning(refreshJobFields);

  return recoveredJobs.length;
};

export const deleteRefreshJob = async (db: Database, jobId: string) => {
  await db.delete(refreshJob).where(eq(refreshJob.id, jobId));
};

export const getRefreshJobsForTarget = async (
  db: Database,
  input: {
    kind?: RefreshJobKind;
    targetId: string;
    targetType?: RefreshJobTargetType;
  }
) => {
  const conditions = [eq(refreshJob.targetId, input.targetId)];

  if (input.kind) {
    conditions.push(eq(refreshJob.kind, input.kind));
  }

  if (input.targetType) {
    conditions.push(eq(refreshJob.targetType, input.targetType));
  }

  return await db
    .select(refreshJobFields)
    .from(refreshJob)
    .where(and(...conditions))
    .orderBy(asc(refreshJob.createdAt));
};

export const deleteRefreshJobsForTarget = async (
  db: Database,
  input: {
    kind?: RefreshJobKind;
    targetId: string;
    targetType?: RefreshJobTargetType;
  }
) => {
  const conditions = [eq(refreshJob.targetId, input.targetId)];

  if (input.kind) {
    conditions.push(eq(refreshJob.kind, input.kind));
  }

  if (input.targetType) {
    conditions.push(eq(refreshJob.targetType, input.targetType));
  }

  await db.delete(refreshJob).where(and(...conditions));
};

export const deleteCodeforcesAccountStatsRefreshJob = (
  db: Database,
  accountId: string
) =>
  deleteRefreshJobsForTarget(db, {
    kind: codeforcesAccountStatsJobKind,
    targetId: accountId,
    targetType: ojAccountTargetType,
  });

export const deleteLuoguAccountStatsRefreshJob = (
  db: Database,
  accountId: string
) =>
  deleteRefreshJobsForTarget(db, {
    kind: luoguAccountStatsJobKind,
    targetId: accountId,
    targetType: ojAccountTargetType,
  });

export const deleteLuoguProblemDetailsRefreshJob = (
  db: Database,
  pid: string
) =>
  deleteRefreshJobsForTarget(db, {
    kind: luoguProblemDetailsJobKind,
    targetId: pid,
    targetType: luoguProblemTargetType,
  });

export const deleteUserAwardsFromLuoguRefreshJob = (
  db: Database,
  accountId: string
) =>
  deleteRefreshJobsForTarget(db, {
    kind: userAwardsFromLuoguJobKind,
    targetId: accountId,
    targetType: ojAccountTargetType,
  });
