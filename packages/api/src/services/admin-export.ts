import { createHash } from "node:crypto";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import {
  problemSet,
  problemSetProblem,
} from "@hhuacm-dashboard/db/schema/problem-set";
import { userProfile } from "@hhuacm-dashboard/db/schema/profile";
import { defaultMemberStatus, type OjPlatform } from "@hhuacm-dashboard/domain";
import { asc, eq, inArray } from "drizzle-orm";
import type { Context } from "../context";
import {
  defaultHomeNoticeMarkdown,
  getHomeNoticeMarkdown,
} from "./site-setting";

type Database = Context["db"];

const exportKind = "hhuacm-dashboard.system-seed";
const exportVersion = 1;
const defaultUserRole = "user";

export interface SystemExportOjAccount {
  handle: string;
  platform: OjPlatform;
}

export interface SystemExportUserProfile {
  grade?: string;
  major?: string;
  memberStatus?: string;
  realName?: string;
  studentId?: string;
}

export interface SystemExportUser {
  email: string;
  ojAccounts?: SystemExportOjAccount[];
  profile?: SystemExportUserProfile;
  role?: "admin";
  username: string;
}

export interface SystemExportProblemSet {
  descriptionMarkdown?: string;
  pids: string[];
  title: string;
}

export interface SystemExportSettings {
  homeNoticeMarkdown?: string;
}

interface SystemExportSeed {
  problemSets: SystemExportProblemSet[];
  settings: SystemExportSettings;
  users: SystemExportUser[];
}

interface SystemExportHashPayload {
  kind: typeof exportKind;
  seed: SystemExportSeed;
  version: typeof exportVersion;
}

export interface SystemExport extends SystemExportHashPayload {
  exportedAt: string;
  hash: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const canonicalize = (value: unknown): unknown => {
  if (!(value && typeof value === "object")) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  return Object.keys(value)
    .sort((left, right) => left.localeCompare(right))
    .reduce<Record<string, unknown>>((result, key) => {
      if (!isRecord(value)) {
        return result;
      }

      const nextValue = value[key];
      if (nextValue !== undefined) {
        result[key] = canonicalize(nextValue);
      }
      return result;
    }, {});
};

const stringifyCanonicalJson = (value: unknown) =>
  JSON.stringify(canonicalize(value));

const hashCanonicalJson = (value: unknown) =>
  createHash("sha256").update(stringifyCanonicalJson(value)).digest("hex");

const isFilledString = (value: null | string): value is string =>
  value !== null && value !== "";

const groupOjAccountsByUserId = (
  accounts: Array<SystemExportOjAccount & { userId: string }>
) => {
  const accountsByUserId = new Map<string, SystemExportOjAccount[]>();

  for (const account of accounts) {
    const currentAccounts = accountsByUserId.get(account.userId) ?? [];
    currentAccounts.push({
      handle: account.handle,
      platform: account.platform,
    });
    accountsByUserId.set(account.userId, currentAccounts);
  }

  return accountsByUserId;
};

const listOjAccountsForUsers = async (db: Database, userIds: string[]) => {
  if (userIds.length === 0) {
    return new Map<string, SystemExportOjAccount[]>();
  }

  const accounts = await db
    .select({
      handle: userOjAccount.handle,
      platform: userOjAccount.platform,
      userId: userOjAccount.userId,
    })
    .from(userOjAccount)
    .where(inArray(userOjAccount.userId, userIds))
    .orderBy(
      asc(userOjAccount.platform),
      asc(userOjAccount.handle),
      asc(userOjAccount.id)
    );

  return groupOjAccountsByUserId(accounts);
};

const toExportUserProfile = (profile: {
  grade: null | string;
  major: null | string;
  memberStatus: null | string;
  realName: null | string;
  studentId: null | string;
}) => {
  const exportProfile: SystemExportUserProfile = {};

  if (isFilledString(profile.grade)) {
    exportProfile.grade = profile.grade;
  }

  if (isFilledString(profile.major)) {
    exportProfile.major = profile.major;
  }

  if (profile.memberStatus && profile.memberStatus !== defaultMemberStatus) {
    exportProfile.memberStatus = profile.memberStatus;
  }

  if (isFilledString(profile.realName)) {
    exportProfile.realName = profile.realName;
  }

  if (isFilledString(profile.studentId)) {
    exportProfile.studentId = profile.studentId;
  }

  return Object.keys(exportProfile).length > 0 ? exportProfile : undefined;
};

const listExportUsers = async (db: Database) => {
  const users = await db
    .select({
      email: user.email,
      grade: userProfile.grade,
      id: user.id,
      major: userProfile.major,
      memberStatus: userProfile.memberStatus,
      realName: userProfile.realName,
      role: user.role,
      studentId: userProfile.studentId,
      username: user.username,
    })
    .from(user)
    .leftJoin(userProfile, eq(userProfile.userId, user.id))
    .orderBy(asc(user.username), asc(user.email), asc(user.id));

  const userIds = users.map((currentUser) => currentUser.id);
  const accountsByUserId = await listOjAccountsForUsers(db, userIds);
  const exportUsers = users.map((currentUser): SystemExportUser => {
    const ojAccounts = accountsByUserId.get(currentUser.id) ?? [];
    const profile = toExportUserProfile(currentUser);

    return {
      email: currentUser.email,
      ...(ojAccounts.length > 0 ? { ojAccounts } : {}),
      ...(profile ? { profile } : {}),
      ...(currentUser.role === defaultUserRole
        ? {}
        : { role: currentUser.role }),
      username: currentUser.username,
    };
  });

  return exportUsers;
};

const listExportProblemSets = async (db: Database) => {
  const sets = await db
    .select({
      descriptionMarkdown: problemSet.descriptionMarkdown,
      id: problemSet.id,
      title: problemSet.title,
    })
    .from(problemSet);

  if (sets.length === 0) {
    return [];
  }

  const setIds = sets.map((set) => set.id);
  const problems = await db
    .select({
      pid: problemSetProblem.pid,
      problemSetId: problemSetProblem.problemSetId,
      sortOrder: problemSetProblem.sortOrder,
    })
    .from(problemSetProblem)
    .where(inArray(problemSetProblem.problemSetId, setIds))
    .orderBy(
      asc(problemSetProblem.problemSetId),
      asc(problemSetProblem.sortOrder),
      asc(problemSetProblem.pid)
    );
  const pidsBySetId = new Map<string, string[]>();

  for (const problem of problems) {
    const pids = pidsBySetId.get(problem.problemSetId) ?? [];
    pids.push(problem.pid);
    pidsBySetId.set(problem.problemSetId, pids);
  }

  return sets
    .map(
      (set): SystemExportProblemSet => ({
        ...(set.descriptionMarkdown
          ? { descriptionMarkdown: set.descriptionMarkdown }
          : {}),
        pids: pidsBySetId.get(set.id) ?? [],
        title: set.title,
      })
    )
    .sort((left, right) => {
      const titleOrder = left.title.localeCompare(right.title, "zh-CN");

      if (titleOrder !== 0) {
        return titleOrder;
      }

      const descriptionOrder = (left.descriptionMarkdown ?? "").localeCompare(
        right.descriptionMarkdown ?? "",
        "zh-CN"
      );

      if (descriptionOrder !== 0) {
        return descriptionOrder;
      }

      return left.pids.join("\n").localeCompare(right.pids.join("\n"));
    });
};

const getExportSettings = async (db: Database) => {
  const homeNoticeMarkdown = await getHomeNoticeMarkdown(db);
  const settings: SystemExportSettings = {
    ...(homeNoticeMarkdown === defaultHomeNoticeMarkdown
      ? {}
      : { homeNoticeMarkdown }),
  };

  return settings;
};

export const exportAdminSystem = async (
  db: Database
): Promise<SystemExport> => {
  const [users, problemSets, settings] = await Promise.all([
    listExportUsers(db),
    listExportProblemSets(db),
    getExportSettings(db),
  ]);
  const seed: SystemExportSeed = {
    problemSets,
    settings,
    users,
  };
  const hashPayload: SystemExportHashPayload = {
    kind: exportKind,
    seed,
    version: exportVersion,
  };

  return {
    ...hashPayload,
    exportedAt: new Date().toISOString(),
    hash: hashCanonicalJson(hashPayload),
  };
};
