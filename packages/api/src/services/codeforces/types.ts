export interface CodeforcesAccount {
  handle: string;
  id: string;
}

export interface PublicCodeforcesStats {
  acceptedProblemCount: null | number;
  acceptedProblemCountInMonth: null | number;
  fetchedAt: null | string;
  handle: string;
  isStale: boolean;
  lastAttemptedAt: string;
  lastError: null | string;
  lastOnlineAt: null | string;
  maxRating: null | number;
  rating: null | number;
  syncStatus: "empty" | "failed" | "ready" | "refreshing";
}

export interface CodeforcesProblemSummary {
  acceptedProblemCount: number;
  acceptedProblemCountSince: number;
}
