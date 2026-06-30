import { describe, expect, test } from "bun:test";

import {
  codeforcesStatsStatusOptions,
  getStatsStatusClassName,
  getStatsStatusText,
  luoguStatsStatusOptions,
} from "./public-profile-view";

describe("getStatsStatusText", () => {
  test("keeps the shared text and platform differences", () => {
    expect(getStatsStatusText(undefined)).toBe("等待数据");
    expect(getStatsStatusText(undefined, codeforcesStatsStatusOptions)).toBe(
      "等待刷新"
    );
    expect(
      getStatsStatusText(
        { fetchedAt: null, syncStatus: "failed" },
        luoguStatsStatusOptions
      )
    ).toBe("读取失败");
    expect(
      getStatsStatusText({
        fetchedAt: "2026-06-30T00:00:00.000Z",
        syncStatus: "failed",
      })
    ).toBe("刷新失败，显示旧数据");
  });
});

describe("getStatsStatusClassName", () => {
  test("keeps Codeforces empty status muted and other pending statuses accented", () => {
    expect(getStatsStatusClassName(undefined)).toBe("text-accent");
    expect(
      getStatsStatusClassName(undefined, codeforcesStatsStatusOptions)
    ).toBe("text-muted");
    expect(
      getStatsStatusClassName({ fetchedAt: null, syncStatus: "refreshing" })
    ).toBe("text-accent");
    expect(
      getStatsStatusClassName({ fetchedAt: null, syncStatus: "failed" })
    ).toBe("text-danger");
  });
});
