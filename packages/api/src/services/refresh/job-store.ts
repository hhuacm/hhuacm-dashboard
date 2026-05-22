import { refreshJob } from "@hhuacm-dashboard/db/schema/refresh-job";
import { and, asc, eq, type InferSelectModel, or } from "drizzle-orm";

import type { Context } from "../../context";
import type { RefreshJobKind } from "./job-types";

type Database = Context["db"];

const refreshJobFields = {
  createdAt: refreshJob.createdAt,
  kind: refreshJob.kind,
  status: refreshJob.status,
  targetId: refreshJob.targetId,
} as const;

export type RefreshJob = Pick<
  InferSelectModel<typeof refreshJob>,
  keyof typeof refreshJobFields
>;

export const enqueueRefreshJob = async (
  db: Database,
  input: {
    kind: RefreshJobKind;
    targetId: string;
  }
) => {
  const [existingJob] = await db
    .select(refreshJobFields)
    .from(refreshJob)
    .where(
      and(
        eq(refreshJob.kind, input.kind),
        eq(refreshJob.targetId, input.targetId),
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
    })
    .returning(refreshJobFields);

  return job ?? null;
};

export const claimNextPendingRefreshJob = async (db: Database) => {
  const [candidate] = await db
    .select({
      kind: refreshJob.kind,
      targetId: refreshJob.targetId,
    })
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
      and(
        eq(refreshJob.kind, candidate.kind),
        eq(refreshJob.targetId, candidate.targetId),
        eq(refreshJob.status, "pending")
      )
    )
    .returning(refreshJobFields);

  return claimedJob ?? null;
};

export const recoverRunningRefreshJobs = async (db: Database) => {
  const recoveredJobs = await db
    .update(refreshJob)
    .set({
      status: "pending",
    })
    .where(eq(refreshJob.status, "running"))
    .returning(refreshJobFields);

  return recoveredJobs.length;
};

export const deleteRefreshJob = async (
  db: Database,
  input: {
    kind: RefreshJobKind;
    targetId: string;
  }
) => {
  await db
    .delete(refreshJob)
    .where(
      and(
        eq(refreshJob.kind, input.kind),
        eq(refreshJob.targetId, input.targetId)
      )
    );
};
