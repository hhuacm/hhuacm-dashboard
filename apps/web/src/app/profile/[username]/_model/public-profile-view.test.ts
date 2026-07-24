import { describe, expect, test } from "bun:test";

import {
  codeforcesStatsStatusOptions,
  getStatsStatusPresentation,
  luoguStatsStatusOptions,
} from "./public-profile-view";

describe("getStatsStatusPresentation", () => {
  test("keeps the shared text and platform differences", () => {
    expect(getStatsStatusPresentation(undefined)).toEqual({
      text: "等待数据",
      tone: "accent",
    });
    expect(
      getStatsStatusPresentation(undefined, codeforcesStatsStatusOptions)
    ).toEqual({
      text: "等待刷新",
      tone: "muted",
    });
    expect(
      getStatsStatusPresentation(
        { fetchedAt: null, syncStatus: "failed" },
        luoguStatsStatusOptions
      )
    ).toEqual({
      text: "读取失败",
      tone: "danger",
    });
    expect(
      getStatsStatusPresentation({
        fetchedAt: "2026-06-30T00:00:00.000Z",
        syncStatus: "failed",
      })
    ).toEqual({
      text: "刷新失败，显示旧数据",
      tone: "danger",
    });
  });
});
