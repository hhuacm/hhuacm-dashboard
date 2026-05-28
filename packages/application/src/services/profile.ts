import type { Database } from "@hhuacm-dashboard/db";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import { userProfile } from "@hhuacm-dashboard/db/schema/profile";
import {
  defaultMemberStatus,
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

export const profileFields = {
  grade: userProfile.grade,
  major: userProfile.major,
  memberStatus: userProfile.memberStatus,
  realName: userProfile.realName,
  studentId: userProfile.studentId,
} as const;

const userFields = {
  email: user.email,
  id: user.id,
  role: user.role,
  username: user.username,
} as const;

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

export const getTargetUser = async (db: Database, userId: string) => {
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

export const getProfileByUserId = async (db: Database, userId: string) => {
  const [profile] = await db
    .select(profileFields)
    .from(userProfile)
    .where(eq(userProfile.userId, userId))
    .limit(1);

  return {
    grade: profile?.grade ?? null,
    major: profile?.major ?? null,
    memberStatus: profile?.memberStatus ?? defaultMemberStatus,
    realName: profile?.realName ?? null,
    studentId: profile?.studentId ?? null,
  };
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
  const profile = await getProfileByUserId(db, targetUser.id);
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
  const profile = await getProfileByUserId(db, currentUser.id);
  const ojAccounts = await listOjAccountsByUserId(db, currentUser.id);

  return {
    ojAccounts,
    profile,
    user: {
      email: currentUser.email,
      username: currentUser.username,
    },
  };
};

export const updateUserProfile = async (
  db: Database,
  input: {
    notFoundCode: "INTERNAL_SERVER_ERROR" | "NOT_FOUND";
    userId: string;
    values: ProfileUpdateValues;
  }
) => {
  await getTargetUser(db, input.userId);

  const [profile] = await db
    .insert(userProfile)
    .values({
      ...input.values,
      userId: input.userId,
    })
    .onConflictDoUpdate({
      set: {
        ...input.values,
      },
      target: userProfile.userId,
    })
    .returning(profileFields);

  if (!profile) {
    throw new ApplicationError({ code: input.notFoundCode });
  }

  return {
    ...profile,
    memberStatus: profile.memberStatus ?? defaultMemberStatus,
  };
};
