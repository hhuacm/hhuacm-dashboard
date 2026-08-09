import { setTimeout as sleep } from "node:timers/promises";
import type { Database } from "@hhuacm-dashboard/db";
import { enqueueDueAccountStatsRequests } from "./account-stats";
import { enqueueMissingLuoguProblemDetailsRequests } from "./jobs/luogu-problem-details";
import { enqueueDueUserAwardsFromLuoguRequests } from "./jobs/user-awards-from-luogu";
import { refreshDefaults } from "./policy";
import { runRefreshWorkerOnce } from "./worker";

export const enqueueDueRefreshTargets = async (
  db: Database,
  now = new Date()
) => {
  await enqueueDueAccountStatsRequests(db, now);
  await enqueueMissingLuoguProblemDetailsRequests(db);
  await enqueueDueUserAwardsFromLuoguRequests(db, now);
};

export const startRefreshRuntime = (db: Database) => {
  let isStopped = false;

  const stop = () => {
    isStopped = true;
  };

  const startWorkerLoop = async () => {
    while (!isStopped) {
      try {
        const didWork = await runRefreshWorkerOnce(db);

        if (!didWork) {
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
