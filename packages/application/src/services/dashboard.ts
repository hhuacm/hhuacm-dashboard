import type { Database } from "@hhuacm-dashboard/db";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import { userProfile } from "@hhuacm-dashboard/db/schema/profile";
import { defaultMemberStatus } from "@hhuacm-dashboard/domain";
import { eq, sql } from "drizzle-orm";

export const getDashboardSummary = async (db: Database) => {
  const [summary] = await db
    .select({
      activeUsers: sql<number | null>`
            sum(case when ${userProfile.memberStatus} = 'active' then 1 else 0 end)
          `.mapWith(Number),
      selectionUsers: sql<number | null>`
            sum(case when ${userProfile.memberStatus} is null or ${userProfile.memberStatus} = ${defaultMemberStatus} then 1 else 0 end)
          `.mapWith(Number),
      totalUsers: sql<number>`count(${user.id})`.mapWith(Number),
    })
    .from(user)
    .leftJoin(userProfile, eq(userProfile.userId, user.id));

  return {
    activeUsers: summary?.activeUsers ?? 0,
    selectionUsers: summary?.selectionUsers ?? 0,
    totalUsers: summary?.totalUsers ?? 0,
  };
};
