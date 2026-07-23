import { setTimeout as sleep } from "node:timers/promises";
import type { Database } from "@hhuacm-dashboard/db";
import { refreshJobDefinitions } from "./jobs";
import type { RefreshJobDefinition } from "./jobs/definition";
import { refreshDefaults } from "./policy";
import { runRefreshWorkerOnce } from "./worker";

export const enqueueDueRefreshTargets = async (
  db: Database,
  definitions: readonly RefreshJobDefinition[] = refreshJobDefinitions,
  now = new Date()
) => {
  let enqueuedCount = 0;

  for (const definition of definitions) {
    if (!definition.enqueueDueTargets) {
      continue;
    }

    enqueuedCount += await definition.enqueueDueTargets(db, now);
  }

  return enqueuedCount;
};

export const startRefreshRuntime = (db: Database) => {
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
        await enqueueDueRefreshTargets(db);
      } catch (error) {
        console.error("Refresh scheduler iteration failed", error);
      }

      await sleep(refreshDefaults.dueScanIntervalMs);
    }
  };

  startWorkerLoop().catch((error) => {
    console.error("Refresh worker stopped unexpectedly", error);
  });
  startSchedulerLoop().catch((error) => {
    console.error("Refresh scheduler stopped unexpectedly", error);
  });

  return { stop };
};
