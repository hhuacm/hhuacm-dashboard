import { afterEach, describe, expect, it } from "bun:test";

import { luoguSource } from "./api";

const originalFetch = globalThis.fetch;

const mockJsonResponse = (payload: unknown) => {
  globalThis.fetch = Object.assign(async () => Response.json(payload), {
    preconnect: originalFetch.preconnect,
  });
};

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("luoguSource", () => {
  it("throws when user search response has no users array", async () => {
    mockJsonResponse({});

    await expect(
      luoguSource.searchUsers({ keyword: "kkksc03" })
    ).rejects.toThrow("Luogu user/search returned invalid JSON");
  });

  it("filters users without the fields used by the service layer", async () => {
    mockJsonResponse({
      users: [
        {
          avatar: "https://cdn.luogu.com.cn/upload/usericon/1.png",
          name: "kkksc03",
          uid: 1,
        },
        {
          name: "missing-uid",
        },
        {
          uid: 2,
        },
      ],
    });

    await expect(
      luoguSource.searchUsers({ keyword: "kkksc03" })
    ).resolves.toEqual([
      {
        name: "kkksc03",
        uid: 1,
      },
    ]);
  });
});
