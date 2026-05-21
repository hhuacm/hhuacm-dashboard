import { siteSetting } from "@hhuacm-dashboard/db/schema/site-setting";
import { eq } from "drizzle-orm";

import type { Context } from "../context";

type Database = Context["db"];

const homeNoticeMarkdownKey = "home_notice_markdown";

export const defaultHomeNoticeMarkdown =
  "本网站为 HHUACM Dashboard，目前处于开发测试阶段，旨在协助校 ACM 队进行成员登记、练习状态统计与查询等功能的实现。";

export const getHomeNoticeMarkdown = async (db: Database) => {
  const [setting] = await db
    .select({ value: siteSetting.value })
    .from(siteSetting)
    .where(eq(siteSetting.key, homeNoticeMarkdownKey))
    .limit(1);

  return setting?.value ?? defaultHomeNoticeMarkdown;
};

export const updateHomeNoticeMarkdown = async (
  db: Database,
  markdown: string
) => {
  const [setting] = await db
    .insert(siteSetting)
    .values({
      key: homeNoticeMarkdownKey,
      value: markdown,
    })
    .onConflictDoUpdate({
      set: {
        updatedAt: new Date(),
        value: markdown,
      },
      target: siteSetting.key,
    })
    .returning({ value: siteSetting.value });

  return setting?.value ?? markdown;
};
