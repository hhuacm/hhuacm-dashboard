import { describe, expect, it } from "bun:test";

import { refreshDefaults } from "../refresh/constants";
import { getCodeforcesRankStatus } from "./codeforces";

describe("getCodeforcesRankStatus", () => {
  const now = new Date("2026-05-17T00:00:00.000Z");

  it("prioritizes active refresh jobs", () => {
    expect(
      getCodeforcesRankStatus({
        fetchedAt: now,
        hasActiveRefreshJob: true,
        lastError: "failed",
        now,
        statsHandle: "tourist",
      })
    ).toBe("refreshing");
  });

  it("marks missing stats as empty", () => {
    expect(
      getCodeforcesRankStatus({
        fetchedAt: now,
        hasActiveRefreshJob: false,
        lastError: null,
        now,
        statsHandle: null,
      })
    ).toBe("empty");
  });

  it("marks failed stats before freshness", () => {
    expect(
      getCodeforcesRankStatus({
        fetchedAt: now,
        hasActiveRefreshJob: false,
        lastError: "Codeforces unavailable",
        now,
        statsHandle: "tourist",
      })
    ).toBe("failed");
  });

  it("marks stale stats after the ttl", () => {
    expect(
      getCodeforcesRankStatus({
        fetchedAt: new Date(
          now.getTime() - refreshDefaults.codeforcesStatsTtlMs
        ),
        hasActiveRefreshJob: false,
        lastError: null,
        now,
        statsHandle: "tourist",
      })
    ).toBe("stale");
  });

  it("marks fresh stats as ready", () => {
    expect(
      getCodeforcesRankStatus({
        fetchedAt: new Date(
          now.getTime() - refreshDefaults.codeforcesStatsTtlMs + 1
        ),
        hasActiveRefreshJob: false,
        lastError: null,
        now,
        statsHandle: "tourist",
      })
    ).toBe("ready");
  });
});
