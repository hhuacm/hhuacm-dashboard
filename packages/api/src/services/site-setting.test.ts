import { describe, expect, it } from "bun:test";

import {
  defaultHomeNoticeMarkdown,
  getHomeNoticeMarkdown,
  updateHomeNoticeMarkdown,
} from "./site-setting";
import { createServiceTestDb } from "./test-db";

describe("site settings", () => {
  it("returns the default home notice when no setting is saved", async () => {
    const db = await createServiceTestDb();

    await expect(getHomeNoticeMarkdown(db)).resolves.toBe(
      defaultHomeNoticeMarkdown
    );
  });

  it("returns the updated home notice markdown", async () => {
    const db = await createServiceTestDb();

    await updateHomeNoticeMarkdown(db, "## 训练安排");

    await expect(getHomeNoticeMarkdown(db)).resolves.toBe("## 训练安排");
  });

  it("keeps an empty home notice as an explicit value", async () => {
    const db = await createServiceTestDb();

    await updateHomeNoticeMarkdown(db, "");

    await expect(getHomeNoticeMarkdown(db)).resolves.toBe("");
  });
});
