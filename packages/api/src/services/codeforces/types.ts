import type { RefreshSyncStatus } from "../refresh/sync-status";

export interface CodeforcesAccount {
  handle: string;
  id: string;
}

export interface PublicCodeforcesStats {
  acceptedProblemCount: null | number;
  acceptedProblemCountInMonth: null | number;
  fetchedAt: null | string;
  lastOnlineAt: null | string;
  maxRating: null | number;
  rating: null | number;
  syncStatus: RefreshSyncStatus;
}

export interface CodeforcesProblemSummary {
  acceptedProblemCount: number;
  acceptedProblemCountSince: number;
}
