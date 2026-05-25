import { describe, expect, it } from "bun:test";

import {
  currentMemberStatuses,
  defaultMemberStatus,
  getGradeOptions,
  getGradeOptionsWithCurrentValue,
  getUserNameLabel,
  isCurrentMemberStatus,
  isMemberStatus,
  isOjPlatform,
  isRefreshSyncStatus,
  isStatsDisabledMemberStatus,
  isValidGradeOption,
  memberStatuses,
  memberStatusLabels,
  ojPlatformLabels,
  ojPlatforms,
  refreshSyncStatuses,
  statsDisabledMemberStatuses,
} from ".";

describe("domain constants", () => {
  it("keeps member status labels complete", () => {
    expect(defaultMemberStatus).toBe("selection");
    expect(Object.keys(memberStatusLabels).sort()).toEqual(
      [...memberStatuses].sort()
    );
  });

  it("validates member status values and status groups", () => {
    expect(isMemberStatus("active")).toBe(true);
    expect(isMemberStatus("unknown")).toBe(false);
    expect(currentMemberStatuses).toEqual(["selection", "active"]);
    expect(isCurrentMemberStatus("selection")).toBe(true);
    expect(isCurrentMemberStatus("retired")).toBe(false);
    expect(statsDisabledMemberStatuses).toEqual(["retired", "frozen"]);
    expect(isStatsDisabledMemberStatus("frozen")).toBe(true);
    expect(isStatsDisabledMemberStatus("active")).toBe(false);
  });

  it("keeps OJ platform labels complete", () => {
    expect(Object.keys(ojPlatformLabels).sort()).toEqual(
      [...ojPlatforms].sort()
    );
    expect(isOjPlatform("codeforces")).toBe(true);
    expect(isOjPlatform("unknown")).toBe(false);
  });

  it("validates refresh sync status values", () => {
    expect(refreshSyncStatuses).toEqual([
      "empty",
      "failed",
      "ready",
      "refreshing",
    ]);
    expect(isRefreshSyncStatus("ready")).toBe(true);
    expect(isRefreshSyncStatus("queued")).toBe(false);
  });
});

describe("grade options", () => {
  it("builds recent grade options from the given date", () => {
    expect(getGradeOptions(new Date("2026-01-01T00:00:00.000Z"))).toEqual([
      "2019级",
      "2020级",
      "2021级",
      "2022级",
      "2023级",
      "2024级",
      "2025级",
      "2026级",
      "其他",
    ]);
  });

  it("preserves an existing custom current value", () => {
    expect(
      getGradeOptionsWithCurrentValue(
        "2018级",
        new Date("2026-01-01T00:00:00.000Z")
      )[0]
    ).toBe("2018级");
  });

  it("validates current grade options", () => {
    expect(isValidGradeOption("其他")).toBe(true);
    expect(isValidGradeOption("not-a-grade")).toBe(false);
  });
});

describe("user name labels", () => {
  it("uses real name before username", () => {
    expect(getUserNameLabel({ realName: "张三", username: "zhangsan" })).toBe(
      "张三"
    );
  });

  it("falls back to username", () => {
    expect(getUserNameLabel({ realName: null, username: "zhangsan" })).toBe(
      "zhangsan"
    );
  });

  it("ignores blank names", () => {
    expect(getUserNameLabel({ realName: " ", username: "zhangsan" })).toBe(
      "zhangsan"
    );
    expect(getUserNameLabel({ realName: "", username: "" })).toBe("未命名用户");
  });
});
