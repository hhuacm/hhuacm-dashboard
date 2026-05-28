import { describe, expect, it } from "bun:test";

import { atcoderAccountStatsJob } from "./atcoder-account-stats";
import { findRefreshJobDefinition, refreshJobDefinitions } from "./index";
import { nowcoderAccountStatsJob } from "./nowcoder-account-stats";

describe("refresh job definitions", () => {
  it("registers AtCoder and Nowcoder account stats jobs", () => {
    expect(
      findRefreshJobDefinition(
        refreshJobDefinitions,
        atcoderAccountStatsJob.kind
      )
    ).toBe(atcoderAccountStatsJob);
    expect(
      findRefreshJobDefinition(
        refreshJobDefinitions,
        nowcoderAccountStatsJob.kind
      )
    ).toBe(nowcoderAccountStatsJob);
  });
});
