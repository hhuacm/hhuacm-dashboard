export const refreshDefaults = {
  codeforcesStatsTtlMs: 10 * 60 * 1000,
  jobCooldownMs: 2 * 1000,
  luoguStatsTtlMs: 10 * 60 * 1000,
  maxErrorLength: 500,
  staleScanIntervalMs: 10 * 60 * 1000,
  userAwardsTtlMs: 30 * 60 * 1000,
  workerPollIntervalMs: 5 * 1000,
} as const;

const isFreshByTtl = (fetchedAt: Date | null, now: Date, ttlMs: number) =>
  Boolean(fetchedAt && now.getTime() - fetchedAt.getTime() < ttlMs);

export const truncateRefreshError = (message: string) =>
  message.slice(0, refreshDefaults.maxErrorLength);

export const isCodeforcesStatsCacheFresh = (
  fetchedAt: Date | null,
  now: Date
) => isFreshByTtl(fetchedAt, now, refreshDefaults.codeforcesStatsTtlMs);

export const isLuoguStatsCacheFresh = (fetchedAt: Date | null, now: Date) =>
  isFreshByTtl(fetchedAt, now, refreshDefaults.luoguStatsTtlMs);

export const isUserAwardsCacheFresh = (fetchedAt: Date | null, now: Date) =>
  isFreshByTtl(fetchedAt, now, refreshDefaults.userAwardsTtlMs);

export const isCodeforcesAccountStatsFresh = (input: {
  accountHandle: string;
  fetchedAt: Date | null;
  now: Date;
  statsHandle: null | string;
}) =>
  Boolean(
    input.statsHandle &&
      input.statsHandle.toLowerCase() === input.accountHandle.toLowerCase() &&
      isCodeforcesStatsCacheFresh(input.fetchedAt, input.now)
  );
