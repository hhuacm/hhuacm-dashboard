export const refreshDefaults = {
  accountStatsTtlMs: 60 * 60 * 1000,
  dueScanIntervalMs: 10 * 60 * 1000,
  jobCooldownMs: 2 * 1000,
  maxErrorLength: 500,
  userAwardsTtlMs: 24 * 60 * 60 * 1000,
  workerPollIntervalMs: 5 * 1000,
} as const;

const isFreshByTtl = (fetchedAt: Date | null, now: Date, ttlMs: number) =>
  Boolean(fetchedAt && now.getTime() - fetchedAt.getTime() < ttlMs);

export const truncateRefreshError = (message: string) =>
  message.slice(0, refreshDefaults.maxErrorLength);

export const isAccountStatsCacheFresh = (fetchedAt: Date | null, now: Date) =>
  isFreshByTtl(fetchedAt, now, refreshDefaults.accountStatsTtlMs);

export const isUserAwardsCacheFresh = (fetchedAt: Date | null, now: Date) =>
  isFreshByTtl(fetchedAt, now, refreshDefaults.userAwardsTtlMs);
