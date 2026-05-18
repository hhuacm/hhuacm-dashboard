import type { Context } from "../../context";
import { refreshDefaults } from "./constants";
import { codeforcesAccountStatsRefreshJobDefinition } from "./jobs/codeforces-account-stats";
import { luoguAccountStatsRefreshJobDefinition } from "./jobs/luogu-account-stats";
import {
  deleteRefreshJob,
  type RefreshJob,
  resetRunningRefreshJobs,
  takeNextRefreshJob,
} from "./queue";

type Database = Context["db"];

interface RefreshRuntimeOptions {
  db: Database;
}

export interface RefreshJobDefinition {
  cooldownMs: number;
  handle: (db: Database, job: RefreshJob) => Promise<void>;
  kind: RefreshJob["kind"];
  scanStaleTargets: (db: Database) => Promise<number>;
}

const refreshJobDefinitions = [
  codeforcesAccountStatsRefreshJobDefinition,
  luoguAccountStatsRefreshJobDefinition,
] as const satisfies RefreshJobDefinition[];

const getRefreshJobDefinition = (
  definitions: RefreshJobDefinition[],
  kind: RefreshJob["kind"]
) => {
  const definition = definitions.find((item) => item.kind === kind);

  if (!definition) {
    throw new Error(`Unsupported refresh job kind: ${kind}`);
  }

  return definition;
};

export const scanStaleRefreshTargets = async (
  definitions: RefreshJobDefinition[],
  db: Database
) => {
  let enqueuedCount = 0;

  for (const definition of definitions) {
    enqueuedCount += await definition.scanStaleTargets(db);
  }

  return enqueuedCount;
};

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export const runRefreshWorkerOnce = async (
  db: Database,
  definitions: RefreshJobDefinition[] = refreshJobDefinitions
) => {
  const job = await takeNextRefreshJob(db);

  if (!job) {
    return null;
  }

  const definition = getRefreshJobDefinition(definitions, job.kind);

  try {
    await definition.handle(db, job);
  } finally {
    await deleteRefreshJob(db, job.id);
  }

  return {
    cooldownMs: definition.cooldownMs,
    job,
  };
};

export const enqueueStaleRefreshTargets = (db: Database) =>
  scanStaleRefreshTargets(refreshJobDefinitions, db);

export const recoverInterruptedRefreshJobs = (db: Database) =>
  resetRunningRefreshJobs(db);

export const startRefreshRuntime = ({ db }: RefreshRuntimeOptions) => {
  let isStopped = false;

  const stop = () => {
    isStopped = true;
  };

  const startRunnerLoop = async () => {
    while (!isStopped) {
      try {
        const result = await runRefreshWorkerOnce(db);

        if (!result) {
          await sleep(refreshDefaults.workerPollIntervalMs);
        } else if (result.cooldownMs > 0) {
          await sleep(result.cooldownMs);
        }
      } catch (error) {
        console.error("Refresh runner iteration failed", error);
        await sleep(refreshDefaults.workerPollIntervalMs);
      }
    }
  };

  const startProducerLoop = async () => {
    while (!isStopped) {
      try {
        await enqueueStaleRefreshTargets(db);
      } catch (error) {
        console.error("Refresh producer iteration failed", error);
      }

      await sleep(refreshDefaults.staleScanIntervalMs);
    }
  };

  recoverInterruptedRefreshJobs(db).catch((error) => {
    console.error("Refresh job recovery failed", error);
  });

  startRunnerLoop().catch((error) => {
    console.error("Refresh runner stopped unexpectedly", error);
  });
  startProducerLoop().catch((error) => {
    console.error("Refresh producer stopped unexpectedly", error);
  });

  return { stop };
};
