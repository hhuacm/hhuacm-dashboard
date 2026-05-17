import { describe, expect, it } from "bun:test";

import {
  defaultMemberStatus,
  getGradeOptions,
  getGradeOptionsWithCurrentValue,
  isValidGradeOption,
  memberStatuses,
  memberStatusLabels,
  ojPlatformLabels,
  ojPlatforms,
} from ".";

describe("domain constants", () => {
  it("keeps member status labels complete", () => {
    expect(defaultMemberStatus).toBe("selection");
    expect(Object.keys(memberStatusLabels).sort()).toEqual(
      [...memberStatuses].sort()
    );
  });

  it("keeps OJ platform labels complete", () => {
    expect(Object.keys(ojPlatformLabels).sort()).toEqual(
      [...ojPlatforms].sort()
    );
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
