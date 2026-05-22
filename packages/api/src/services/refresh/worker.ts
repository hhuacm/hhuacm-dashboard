import type { Context } from "../../context";
import {
  claimNextPendingRefreshJob,
  deleteRefreshJob,
  recoverRunningRefreshJobs,
} from "./job-store";
import {
  findRefreshJobDefinition,
  type RefreshJobDefinition,
  refreshJobDefinitions,
} from "./registry";

type Database = Context["db"];

export const runRefreshWorkerOnce = async (
  db: Database,
  definitions: RefreshJobDefinition[] = refreshJobDefinitions
) => {
  const job = await claimNextPendingRefreshJob(db);

  if (!job) {
    return null;
  }

  const definition = findRefreshJobDefinition(definitions, job.kind);

  try {
    await definition.handle(db, job);
  } finally {
    await deleteRefreshJob(db, job);
  }

  return {
    job,
  };
};

export const recoverInterruptedRefreshJobs = (db: Database) =>
  recoverRunningRefreshJobs(db);
