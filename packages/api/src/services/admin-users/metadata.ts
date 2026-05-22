import { userProfile } from "@hhuacm-dashboard/db/schema/profile";
import {
  memberStatuses,
  memberStatusLabels,
  ojPlatformLabels,
  ojPlatforms,
} from "@hhuacm-dashboard/domain";
import { asc, isNotNull } from "drizzle-orm";

import type { Database } from "./types";

export const getAdminUsersMetadata = async (db: Database) => {
  const gradeRows = await db
    .select({ value: userProfile.grade })
    .from(userProfile)
    .where(isNotNull(userProfile.grade))
    .groupBy(userProfile.grade)
    .orderBy(asc(userProfile.grade));

  return {
    grades: gradeRows.flatMap((row) =>
      row.value ? [{ label: row.value, value: row.value }] : []
    ),
    memberStatuses: memberStatuses.map((status) => ({
      label: memberStatusLabels[status],
      value: status,
    })),
    ojPlatforms: ojPlatforms.map((platform) => ({
      label: ojPlatformLabels[platform],
      value: platform,
    })),
  };
};
