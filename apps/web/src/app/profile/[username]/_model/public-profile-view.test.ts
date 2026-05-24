/// <reference types="bun-types" />

import { describe, expect, it } from "bun:test";

import {
  getCodeforcesStatusClassName,
  getCodeforcesStatusText,
  type PublicOjAccount,
} from "./public-profile-view";

type PublicCodeforcesStats = NonNullable<PublicOjAccount["codeforces"]>;

const createCodeforcesStats = (
  input: Partial<PublicCodeforcesStats> = {}
): PublicCodeforcesStats => ({
  acceptedProblemCount: null,
  acceptedProblemCountInMonth: null,
  fetchedAt: null,
  lastAttemptedAt: "2026-05-24T00:00:00.000Z",
  lastError: null,
  lastOnlineAt: null,
  maxRating: null,
  rating: null,
  syncStatus: "empty",
  ...input,
});

describe("Codeforces profile status view", () => {
  it("uses refreshing as the public status for outdated cached data", () => {
    const stats = createCodeforcesStats({
      fetchedAt: "2026-05-24T00:00:00.000Z",
      syncStatus: "refreshing",
    });

    expect(getCodeforcesStatusText(stats)).toBe("后台刷新中");
    expect(getCodeforcesStatusClassName(stats)).toBe("text-accent");
  });

  it("keeps old-data wording for refreshing and failed cached data", () => {
    const fetchedAt = "2026-05-24T00:00:00.000Z";

    expect(
      getCodeforcesStatusText(
        createCodeforcesStats({ fetchedAt, syncStatus: "refreshing" })
      )
    ).toBe("后台刷新中");
    expect(
      getCodeforcesStatusText(
        createCodeforcesStats({ fetchedAt, syncStatus: "failed" })
      )
    ).toBe("刷新失败，显示旧数据");
  });
});
