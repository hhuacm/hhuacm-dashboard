import type { Database } from "@hhuacm-dashboard/db";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import {
  problemSet,
  problemSetProblem,
} from "@hhuacm-dashboard/db/schema/problem-set";
import { userProfile } from "@hhuacm-dashboard/db/schema/profile";
import {
  defaultMemberStatus,
  type MemberStatus,
} from "@hhuacm-dashboard/domain";
import { asc, eq, inArray } from "drizzle-orm";
import {
  defaultHomeNoticeMarkdown,
  getHomeNoticeMarkdown,
} from "../services/site-setting";
import {
  createSystemSeedFile,
  type SystemSeed,
  type SystemSeedFile,
  type SystemSeedOjAccount,
  type SystemSeedProblemSet,
  type SystemSeedSettings,
  type SystemSeedUser,
  type SystemSeedUserProfile,
} from "./seed-format";

const defaultUserRole = "user";

const isFilledString = (value: null | string): value is string =>
  value !== null && value !== "";

const groupOjAccountsByUserId = (
  accounts: Array<SystemSeedOjAccount & { userId: string }>
) => {
  const accountsByUserId = new Map<string, SystemSeedOjAccount[]>();

  for (const account of accounts) {
    const currentAccounts = accountsByUserId.get(account.userId) ?? [];
    currentAccounts.push({
      externalId: account.externalId,
      platform: account.platform,
    });
    accountsByUserId.set(account.userId, currentAccounts);
  }

  return accountsByUserId;
};

const listOjAccountsForUsers = async (db: Database, userIds: string[]) => {
  if (userIds.length === 0) {
    return new Map<string, SystemSeedOjAccount[]>();
  }

  const accounts = await db
    .select({
      externalId: userOjAccount.externalId,
      platform: userOjAccount.platform,
      userId: userOjAccount.userId,
    })
    .from(userOjAccount)
    .where(inArray(userOjAccount.userId, userIds))
    .orderBy(
      asc(userOjAccount.platform),
      asc(userOjAccount.externalId),
      asc(userOjAccount.id)
    );

  return groupOjAccountsByUserId(accounts);
};

const toExportUserProfile = (profile: {
  grade: null | string;
  major: null | string;
  memberStatus: MemberStatus | null;
  realName: null | string;
  studentId: null | string;
}) => {
  const exportProfile: SystemSeedUserProfile = {};

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
  const exportUsers = users.map((currentUser): SystemSeedUser => {
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
      (set): SystemSeedProblemSet => ({
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
  const settings: SystemSeedSettings = {
    ...(homeNoticeMarkdown === defaultHomeNoticeMarkdown
      ? {}
      : { homeNoticeMarkdown }),
  };

  return settings;
};

export const exportSystemSeed = async (
  db: Database
): Promise<SystemSeedFile> => {
  const [users, problemSets, settings] = await Promise.all([
    listExportUsers(db),
    listExportProblemSets(db),
    getExportSettings(db),
  ]);
  const seed: SystemSeed = {
    problemSets,
    settings,
    users,
  };

  return createSystemSeedFile(seed);
};
