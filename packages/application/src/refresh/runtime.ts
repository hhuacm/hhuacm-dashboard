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

export const runRefreshRuntime = async (db: Database) => {
  const workerLoop = async () => {
    while (true) {
      try {
        const didWork = await runRefreshWorkerOnce(db);
        await sleep(
          didWork
            ? refreshDefaults.jobCooldownMs
            : refreshDefaults.workerPollIntervalMs
        );
      } catch (error) {
        console.error("Refresh worker iteration failed", error);
        await sleep(refreshDefaults.workerPollIntervalMs);
      }
    }
  };

  const schedulerLoop = async () => {
    while (true) {
      try {
        await enqueueDueRefreshTargets(db);
      } catch (error) {
        console.error("Refresh scheduler iteration failed", error);
      }

      await sleep(refreshDefaults.dueScanIntervalMs);
    }
  };

  await Promise.all([workerLoop(), schedulerLoop()]);
};
