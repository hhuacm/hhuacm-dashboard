import type { Context } from "../../context";
import { refreshDefaults } from "./policy";
import { type RefreshJobDefinition, refreshJobDefinitions } from "./registry";
import { recoverInterruptedRefreshJobs, runRefreshWorkerOnce } from "./worker";

type Database = Context["db"];

interface RefreshRuntimeOptions {
  db: Database;
}

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export const scanStaleRefreshTargets = async (
  db: Database,
  definitions: RefreshJobDefinition[] = refreshJobDefinitions,
  now = new Date()
) => {
  let enqueuedCount = 0;

  for (const definition of definitions) {
    if (!definition.scanStaleTargets) {
      continue;
    }

    enqueuedCount += await definition.scanStaleTargets(db, now);
  }

  return enqueuedCount;
};

export const startRefreshRuntime = ({ db }: RefreshRuntimeOptions) => {
  let isStopped = false;

  const stop = () => {
    isStopped = true;
  };

  const startWorkerLoop = async () => {
    while (!isStopped) {
      try {
        const result = await runRefreshWorkerOnce(db);

        if (!result) {
          await sleep(refreshDefaults.workerPollIntervalMs);
        } else if (refreshDefaults.jobCooldownMs > 0) {
          await sleep(refreshDefaults.jobCooldownMs);
        }
      } catch (error) {
        console.error("Refresh worker iteration failed", error);
        await sleep(refreshDefaults.workerPollIntervalMs);
      }
    }
  };

  const startSchedulerLoop = async () => {
    while (!isStopped) {
      try {
        await scanStaleRefreshTargets(db);
      } catch (error) {
        console.error("Refresh scheduler iteration failed", error);
      }

      await sleep(refreshDefaults.staleScanIntervalMs);
    }
  };

  recoverInterruptedRefreshJobs(db).catch((error) => {
    console.error("Refresh job recovery failed", error);
  });

  startWorkerLoop().catch((error) => {
    console.error("Refresh worker stopped unexpectedly", error);
  });
  startSchedulerLoop().catch((error) => {
    console.error("Refresh scheduler stopped unexpectedly", error);
  });

  return { stop };
};
