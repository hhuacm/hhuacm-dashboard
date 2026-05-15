export interface CodeforcesAccount {
  handle: string;
  id: string;
}

export interface PublicCodeforcesStats {
  acceptedProblemCount: null | number;
  acceptedProblemCountInMonth: null | number;
  fetchedAt: null | string;
  handle: string;
  lastAttemptedAt: string;
  lastError: null | string;
  lastOnlineAt: null | string;
  maxRating: null | number;
  rating: null | number;
  syncStatus: "failed" | "ready";
}

export interface CodeforcesProblemSummary {
  acceptedProblemCount: number;
  acceptedProblemCountSince: number;
}
