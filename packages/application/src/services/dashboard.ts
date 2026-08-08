import type { Database } from "@hhuacm-dashboard/db";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import { defaultMemberStatus } from "@hhuacm-dashboard/domain";
import { sql } from "drizzle-orm";

export const getDashboardSummary = async (db: Database) => {
  const [summary] = await db
    .select({
      activeUsers: sql<number | null>`
            sum(case when ${user.memberStatus} = 'active' then 1 else 0 end)
          `.mapWith(Number),
      selectionUsers: sql<number | null>`
            sum(case when ${user.memberStatus} = ${defaultMemberStatus} then 1 else 0 end)
          `.mapWith(Number),
      totalUsers: sql<number>`count(${user.id})`.mapWith(Number),
    })
    .from(user);

  return {
    activeUsers: summary?.activeUsers ?? 0,
    selectionUsers: summary?.selectionUsers ?? 0,
    totalUsers: summary?.totalUsers ?? 0,
  };
};
