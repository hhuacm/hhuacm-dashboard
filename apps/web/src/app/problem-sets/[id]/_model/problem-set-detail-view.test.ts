import { describe, expect, it } from "bun:test";

import {
  emptyCompletionGradeFilterValue,
  filterCompletionRows,
  getCompletionGradeOptions,
  type ProblemSetCompletion,
} from "./problem-set-detail-view";

const buildCompletion = (
  userId: string,
  completedProblemCount: number,
  grade: null | string
): ProblemSetCompletion => ({
  completedProblemCount,
  grade,
  realName: null,
  userId,
  username: userId,
});

describe("filterCompletionRows", () => {
  const rows = [
    buildCompletion("u1", 8, "24级"),
    buildCompletion("u2", 5, "23级"),
    buildCompletion("u3", 2, null),
    buildCompletion("u4", 10, "24级"),
  ];

  it("keeps rows whose completed count is greater than or equal to the minimum", () => {
    expect(
      filterCompletionRows(rows, {
        minCompletedCount: 6,
        selectedGrades: [],
      }).map((row) => row.userId)
    ).toEqual(["u1", "u4"]);
  });

  it("keeps rows matching selected grades", () => {
    expect(
      filterCompletionRows(rows, {
        selectedGrades: ["24级"],
      }).map((row) => row.userId)
    ).toEqual(["u1", "u4"]);
  });

  it("combines completed count and grade filters", () => {
    expect(
      filterCompletionRows(rows, {
        minCompletedCount: 9,
        selectedGrades: ["24级"],
      }).map((row) => row.userId)
    ).toEqual(["u4"]);
  });

  it("matches empty grades with the empty grade option", () => {
    expect(
      filterCompletionRows(rows, {
        selectedGrades: [emptyCompletionGradeFilterValue],
      }).map((row) => row.userId)
    ).toEqual(["u3"]);
  });

  it("returns all rows without active filters", () => {
    expect(
      filterCompletionRows(rows, {
        selectedGrades: [],
      })
    ).toEqual(rows);
  });
});

describe("getCompletionGradeOptions", () => {
  it("sorts grade options descending and keeps empty grades last", () => {
    expect(
      getCompletionGradeOptions([
        buildCompletion("u1", 1, "23级"),
        buildCompletion("u2", 1, null),
        buildCompletion("u3", 1, "25级"),
        buildCompletion("u4", 1, "24级"),
        buildCompletion("u5", 1, "24级"),
      ])
    ).toEqual([
      { label: "25级", value: "25级" },
      { label: "24级", value: "24级" },
      { label: "23级", value: "23级" },
      { label: "未填写", value: emptyCompletionGradeFilterValue },
    ]);
  });
});
