// Parses a string as a positive integer UID, as used by Luogu and Nowcoder.
export const parseNumericUid = (externalId: string) => {
  const uid = Number(externalId);

  return Number.isSafeInteger(uid) && uid > 0 ? uid : null;
};

// Luogu-specific alias kept for readability at call sites.
export const parseLuoguUid = parseNumericUid;
