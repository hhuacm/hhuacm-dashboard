import { describe, expect, it } from "bun:test";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { userProfile } from "@hhuacm-dashboard/db/schema/profile";
import { refreshJob } from "@hhuacm-dashboard/db/schema/refresh-job";

import { getPublicProfile } from "./profile";
import { createServiceTestDb } from "./test-db";

describe("getPublicProfile", () => {
  it("returns inactive users' bound OJ accounts without stats or refresh jobs", async () => {
    const db = await createServiceTestDb();

    await db.insert(user).values({
      email: "retired@example.com",
      id: "user-retired",
      name: "retired",
      username: "retired",
    });
    await db.insert(userProfile).values({
      memberStatus: "retired",
      userId: "user-retired",
    });
    await db.insert(userOjAccount).values([
      {
        handle: "tourist",
        id: "account-codeforces",
        normalizedHandle: "tourist",
        platform: "codeforces",
        profileUrl: "https://codeforces.com/profile/tourist",
        userId: "user-retired",
      },
      {
        handle: "12345",
        id: "account-luogu",
        normalizedHandle: "12345",
        platform: "luogu",
        profileUrl: "https://www.luogu.com.cn/user/12345",
        userId: "user-retired",
      },
    ]);

    const profile = await getPublicProfile(db, {
      currentUserId: null,
      username: "retired",
    });
    const refreshJobs = await db.select().from(refreshJob);

    expect(profile.profile.memberStatus).toBe("retired");
    expect(profile.ojAccounts).toEqual([
      {
        handle: "tourist",
        platform: "codeforces",
        profileUrl: "https://codeforces.com/profile/tourist",
      },
      {
        handle: "12345",
        platform: "luogu",
        profileUrl: "https://www.luogu.com.cn/user/12345",
      },
    ]);
    expect(refreshJobs).toHaveLength(0);
  });
});
