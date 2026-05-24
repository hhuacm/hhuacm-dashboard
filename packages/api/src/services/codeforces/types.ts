export interface CodeforcesAccount {
  handle: string;
  id: string;
}

export type CodeforcesStatsSyncStatus =
  | "empty"
  | "failed"
  | "ready"
  | "refreshing";

export interface PublicCodeforcesStats {
  acceptedProblemCount: null | number;
  acceptedProblemCountInMonth: null | number;
  fetchedAt: null | string;
  lastAttemptedAt: string;
  lastError: null | string;
  lastOnlineAt: null | string;
  maxRating: null | number;
  rating: null | number;
  syncStatus: CodeforcesStatsSyncStatus;
}

export interface CodeforcesProblemSummary {
  acceptedProblemCount: number;
  acceptedProblemCountSince: number;
}
