import type { Database, DatabaseTransaction } from "@hhuacm-dashboard/db";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import {
  isStatsDisabledMemberStatus,
  type MemberStatus,
  type OjPlatform,
} from "@hhuacm-dashboard/domain";
import { eq } from "drizzle-orm";
import { ApplicationError } from "../errors";
import type { PublicAtcoderStats } from "./atcoder/profile-stats";
import { getAtcoderStatsForProfile } from "./atcoder/profile-stats";
import { getCodeforcesStatsForProfile } from "./codeforces/stats-cache";
import type { PublicCodeforcesStats } from "./codeforces/types";
import type { PublicLuoguStats } from "./luogu/profile-stats";
import { getLuoguStatsForProfile } from "./luogu/profile-stats";
import type { PublicNowcoderStats } from "./nowcoder/profile-stats";
import { getNowcoderStatsForProfile } from "./nowcoder/profile-stats";
import {
  listInternalOjAccountsByUserId,
  listOjAccountsByUserId,
} from "./oj-account/queries";
import {
  getAwardsForPublicProfile,
  type PublicProfileAwards,
} from "./profile-awards";

const userFields = {
  email: user.email,
  grade: user.grade,
  id: user.id,
  major: user.major,
  memberStatus: user.memberStatus,
  realName: user.name,
  role: user.role,
  studentId: user.studentId,
  username: user.username,
} as const;

const toProfile = (currentUser: {
  grade: string;
  major: string;
  memberStatus: MemberStatus;
  realName: string;
  studentId: string;
}) => ({
  grade: currentUser.grade,
  major: currentUser.major,
  memberStatus: currentUser.memberStatus,
  realName: currentUser.realName,
  studentId: currentUser.studentId,
});

export interface PublicOjAccount {
  atcoder?: PublicAtcoderStats | null;
  codeforces?: PublicCodeforcesStats | null;
  externalId: string;
  handle: string;
  luogu?: PublicLuoguStats | null;
  nowcoder?: PublicNowcoderStats | null;
  platform: OjPlatform;
}

const getLuoguAccountId = (
  accounts: Awaited<ReturnType<typeof listInternalOjAccountsByUserId>>
) => accounts.find((account) => account.platform === "luogu")?.id ?? null;

interface ProfileUpdateValues {
  grade?: string;
  major?: string;
  memberStatus?: MemberStatus;
  realName?: string;
  studentId?: string;
}

export const getTargetUser = async (
  db: Database | DatabaseTransaction,
  userId: string
) => {
  const [targetUser] = await db
    .select(userFields)
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!targetUser) {
    throw new ApplicationError({
      code: "NOT_FOUND",
      message: `User does not exist: ${userId}`,
    });
  }

  return targetUser;
};

const getTargetUserByUsername = async (db: Database, username: string) => {
  const [targetUser] = await db
    .select(userFields)
    .from(user)
    .where(eq(user.username, username))
    .limit(1);

  if (!targetUser) {
    throw new ApplicationError({
      code: "NOT_FOUND",
      message: `User does not exist: ${username}`,
    });
  }

  return targetUser;
};

const attachPublicOjAccountData = async (
  db: Database,
  accounts: Awaited<ReturnType<typeof listInternalOjAccountsByUserId>>,
  memberStatus: MemberStatus
): Promise<PublicOjAccount[]> => {
  const publicAccounts: PublicOjAccount[] = [];
  const shouldAttachStats = !isStatsDisabledMemberStatus(memberStatus);

  for (const account of accounts) {
    const publicAccount: PublicOjAccount = {
      externalId: account.externalId,
      handle: account.handle,
      platform: account.platform,
    };

    if (!shouldAttachStats) {
      publicAccounts.push(publicAccount);
      continue;
    }

    if (account.platform === "codeforces") {
      publicAccount.codeforces = await getCodeforcesStatsForProfile(
        db,
        account
      );
    }

    if (account.platform === "atcoder") {
      publicAccount.atcoder = await getAtcoderStatsForProfile(db, account);
    }

    if (account.platform === "luogu") {
      publicAccount.luogu = await getLuoguStatsForProfile(db, account);
    }

    if (account.platform === "nowcoder") {
      publicAccount.nowcoder = await getNowcoderStatsForProfile(db, account);
    }

    publicAccounts.push(publicAccount);
  }

  return publicAccounts;
};

export const getPublicProfile = async (
  db: Database,
  input: { currentUserId: null | string; username: string }
) => {
  const targetUser = await getTargetUserByUsername(db, input.username);
  const profile = toProfile(targetUser);
  const internalOjAccounts = await listInternalOjAccountsByUserId(
    db,
    targetUser.id
  );
  const ojAccounts = await attachPublicOjAccountData(
    db,
    internalOjAccounts,
    profile.memberStatus
  );
  const awards: PublicProfileAwards = await getAwardsForPublicProfile(db, {
    canRefresh: !isStatsDisabledMemberStatus(profile.memberStatus),
    luoguAccountId: getLuoguAccountId(internalOjAccounts),
    userId: targetUser.id,
  });
  const currentUser = input.currentUserId
    ? (
        await db
          .select({ role: user.role })
          .from(user)
          .where(eq(user.id, input.currentUserId))
          .limit(1)
      )[0]
    : null;

  return {
    awards,
    ojAccounts,
    permissions: {
      isAdmin: currentUser?.role === "admin",
      isOwner: input.currentUserId === targetUser.id,
    },
    profile,
    user: {
      email: targetUser.email,
      username: targetUser.username,
    },
  };
};

export const getSettingsProfile = async (db: Database, userId: string) => {
  const currentUser = await getTargetUser(db, userId);
  const ojAccounts = await listOjAccountsByUserId(db, currentUser.id);

  return {
    ojAccounts,
    profile: toProfile(currentUser),
    user: {
      email: currentUser.email,
      username: currentUser.username,
    },
  };
};

export const updateUserProfile = async (
  db: Database,
  input: {
    userId: string;
    values: ProfileUpdateValues;
  }
) => {
  const { realName, ...profileValues } = input.values;

  const [updatedUser] = await db
    .update(user)
    .set({
      ...profileValues,
      ...(realName === undefined ? {} : { name: realName }),
    })
    .where(eq(user.id, input.userId))
    .returning(userFields);

  if (!updatedUser) {
    throw new ApplicationError({ code: "NOT_FOUND" });
  }

  return toProfile(updatedUser);
};
