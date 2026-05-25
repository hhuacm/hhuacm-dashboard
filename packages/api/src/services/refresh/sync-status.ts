import type { RefreshSyncStatus } from "@hhuacm-dashboard/domain";

export type { RefreshSyncStatus } from "@hhuacm-dashboard/domain";

export const getRefreshSyncStatus = (input: {
  fetchedAt: Date | null;
  isQueued: boolean;
  lastError: null | string;
}): RefreshSyncStatus => {
  if (input.isQueued) {
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
