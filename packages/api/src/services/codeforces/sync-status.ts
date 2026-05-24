import type { CodeforcesStatsSyncStatus } from "./types";

export const getCodeforcesStatsSyncStatus = (input: {
  fetchedAt: Date | null;
  hasActiveRefreshRequest: boolean;
  lastError: null | string;
}): CodeforcesStatsSyncStatus => {
  if (input.hasActiveRefreshRequest) {
    return "refreshing";
  }

  if (input.lastError) {
    return "failed";
  }

  if (!input.fetchedAt) {
    return "empty";
  }

  return "ready";
};
