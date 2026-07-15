import { describe, expect, it } from "bun:test";

import { emptyText, formatRelativeTime } from "./rank-utils";

describe("formatRelativeTime", () => {
  it("preserves the exact Chinese relative-time copy", () => {
    const now = Date.now();
    const cases = [
      [30_000, "刚刚"],
      [5 * 60_000 + 5000, "5 分钟前"],
      [3 * 60 * 60_000 + 5000, "3 小时前"],
      [2 * 24 * 60 * 60_000 + 5000, "2 天前"],
      [2 * 7 * 24 * 60 * 60_000 + 5000, "2 周前"],
      [2 * 30 * 24 * 60 * 60_000 + 5000, "2 个月前"],
      [2 * 365 * 24 * 60 * 60_000 + 5000, "2 年前"],
    ] as const;

    expect(formatRelativeTime(null)).toBe(emptyText);

    for (const [elapsedMs, expected] of cases) {
      expect(formatRelativeTime(new Date(now - elapsedMs).toISOString())).toBe(
        expected
      );
    }
  });
});
