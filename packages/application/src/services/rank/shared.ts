import { currentMember } from "@hhuacm-dashboard/db/schema/current-member";
import { asc, sql } from "drizzle-orm";

export const userNameLabelSortExpression = sql<string>`${currentMember.realName}`;

export const rankUserNameOrder = [
  asc(userNameLabelSortExpression),
  asc(currentMember.userId),
] as const;

export const toIsoString = (date: Date | null) => date?.toISOString() ?? null;
