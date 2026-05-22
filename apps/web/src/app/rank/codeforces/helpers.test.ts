/// <reference types="bun-types" />

import { describe, expect, it } from "bun:test";

import { getRankFilterOptions } from "../_shared/rank-utils";
import {
  emptyRankFilters,
  filterRankRows,
  type RankRow,
  sortRankRows,
} from "./helpers";

type RankCodeforcesData = NonNullable<RankRow["codeforces"]>;

const createRankRow = (
  input: Omit<Partial<RankRow>, "codeforces" | "userId"> & {
    codeforces?: Partial<RankCodeforcesData>;
    userId: string;
  }
): RankRow => ({
  codeforces: {
    acceptedProblemCount: null,
    acceptedProblemCountInMonth: null,
    accountId: `${input.userId}-cf`,
    fetchedAt: null,
    handle: input.userId,
    lastError: null,
    lastOnlineAt: null,
    maxRating: null,
    profileUrl: "",
    rating: null,
    status: "ready",
    ...input.codeforces,
  },
  grade: input.grade ?? null,
  major: input.major ?? null,
  realName: input.realName ?? null,
  userId: input.userId,
  username: input.username ?? input.userId,
});

describe("Codeforces rank helpers", () => {
  it("builds sorted filter options", () => {
    expect(
      getRankFilterOptions(
        [
          createRankRow({ grade: "2024级", userId: "a" }),
          createRankRow({ grade: "2023级", userId: "b" }),
          createRankRow({ grade: "2024级", userId: "c" }),
        ],
        "grade"
      )
    ).toEqual([
      { label: "2023级", value: "2023级" },
      { label: "2024级", value: "2024级" },
    ]);
  });

  it("filters by grade, major, and numeric minimums", () => {
    const rows = [
      createRankRow({
        codeforces: { acceptedProblemCount: 200, rating: 1800 },
        grade: "2024级",
        major: "计算机",
        userId: "a",
      }),
      createRankRow({
        codeforces: { acceptedProblemCount: 50, rating: 1900 },
        grade: "2024级",
        major: "计算机",
        userId: "b",
      }),
      createRankRow({
        codeforces: { acceptedProblemCount: 300, rating: 1700 },
        grade: "2023级",
        major: "数学",
        userId: "c",
      }),
    ];

    expect(
      filterRankRows(rows, {
        ...emptyRankFilters,
        grades: ["2024级"],
        majors: ["计算机"],
        minimums: {
          ...emptyRankFilters.minimums,
          acceptedProblemCount: "100",
          rating: "1800",
        },
      }).map((row) => row.userId)
    ).toEqual(["a"]);
  });

  it("sorts null numeric values last", () => {
    const rows = [
      createRankRow({ codeforces: { rating: null }, userId: "empty" }),
      createRankRow({ codeforces: { rating: 1400 }, userId: "low" }),
      createRankRow({ codeforces: { rating: 2000 }, userId: "high" }),
    ];

    expect(
      sortRankRows(rows, {
        column: "rating",
        direction: "descending",
      }).map((row) => row.userId)
    ).toEqual(["high", "low", "empty"]);
  });
});
