/// <reference types="bun-types" />

import { describe, expect, it } from "bun:test";

import {
  type AdminProfileFormValues,
  type AdminUserTableRow,
  emptyAdminUsersFilters,
  getAdminDisplayUsername,
  getChangedAdminProfileValues,
  getFirstVisibleSortColumn,
  getPaginationItems,
  hasFilters,
  isMemberStatusFilterValue,
  isOjPlatformFilterValue,
} from "./helpers";

const createUser = (
  input: Partial<AdminUserTableRow> & { id: string }
): AdminUserTableRow => ({
  email: input.email ?? `${input.id}@example.com`,
  grade: input.grade ?? null,
  id: input.id,
  major: input.major ?? null,
  memberStatus: input.memberStatus ?? "selection",
  name: input.name ?? "",
  ojAccounts: input.ojAccounts ?? [],
  realName: input.realName ?? null,
  role: input.role ?? "user",
  studentId: input.studentId ?? null,
  username: input.username ?? null,
});

describe("admin users helpers", () => {
  it("picks the first available username label", () => {
    expect(
      getAdminDisplayUsername(
        createUser({
          id: "user-1",
          name: "Name",
          username: "username",
        })
      )
    ).toBe("username");
  });

  it("finds the first visible sortable column", () => {
    expect(getFirstVisibleSortColumn(["ojAccounts", "email"])).toBe("email");
    expect(getFirstVisibleSortColumn(["ojAccounts"])).toBeNull();
  });

  it("checks typed filter values", () => {
    expect(isMemberStatusFilterValue("active")).toBe(true);
    expect(isMemberStatusFilterValue("unknown")).toBe(false);
    expect(isOjPlatformFilterValue("codeforces")).toBe(true);
    expect(isOjPlatformFilterValue("unknown")).toBe(false);
  });

  it("detects active filters", () => {
    expect(hasFilters(emptyAdminUsersFilters)).toBe(false);
    expect(
      hasFilters({
        ...emptyAdminUsersFilters,
        ojPlatforms: ["codeforces"],
      })
    ).toBe(true);
  });

  it("creates compact pagination windows", () => {
    expect(getPaginationItems(5, 10)).toEqual([
      1,
      "leading-ellipsis",
      4,
      5,
      6,
      "trailing-ellipsis",
      10,
    ]);
  });

  it("diffs admin profile values", () => {
    const originalValues: AdminProfileFormValues = {
      grade: "2024级",
      major: "计算机",
      memberStatus: "selection",
      realName: "Alice",
      studentId: "1",
    };
    const currentValues: AdminProfileFormValues = {
      ...originalValues,
      memberStatus: "active",
      realName: "Alice Zhang",
    };

    expect(getChangedAdminProfileValues(currentValues, originalValues)).toEqual(
      {
        memberStatus: "active",
        realName: "Alice Zhang",
      }
    );
  });
});
