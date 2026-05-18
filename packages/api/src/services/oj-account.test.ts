import { describe, expect, it } from "bun:test";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import { userProfile } from "@hhuacm-dashboard/db/schema/profile";
import { refreshJob } from "@hhuacm-dashboard/db/schema/refresh-job";
import type { MemberStatus } from "@hhuacm-dashboard/domain";

import { addOjAccount } from "./oj-account";
import { createServiceTestDb } from "./test-db";

describe("addOjAccount", () => {
  const createUser = async (
    db: Awaited<ReturnType<typeof createServiceTestDb>>,
    input: {
      id: string;
      memberStatus?: MemberStatus;
    }
  ) => {
    await db.insert(user).values({
      email: `${input.id}@example.com`,
      id: input.id,
      name: input.id,
      username: input.id,
    });

    if (input.memberStatus) {
      await db.insert(userProfile).values({
        memberStatus: input.memberStatus,
        userId: input.id,
      });
    }
  };

  it("enqueues Codeforces stats only for public activity members", async () => {
    const db = await createServiceTestDb();

    await createUser(db, { id: "active-user", memberStatus: "active" });
    await createUser(db, { id: "retired-user", memberStatus: "retired" });

    await addOjAccount(db, {
      handle: "activeHandle",
      platform: "codeforces",
      userId: "active-user",
    });
    await addOjAccount(db, {
      handle: "retiredHandle",
      platform: "codeforces",
      userId: "retired-user",
    });

    const refreshJobs = await db.select().from(refreshJob);

    expect(refreshJobs).toHaveLength(1);
    expect(refreshJobs[0]?.targetId).toBeTruthy();
  });
});
