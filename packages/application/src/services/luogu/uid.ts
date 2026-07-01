export const parseLuoguUid = (externalId: string) => {
  const uid = Number(externalId);

  return Number.isSafeInteger(uid) && uid > 0 ? uid : null;
};
