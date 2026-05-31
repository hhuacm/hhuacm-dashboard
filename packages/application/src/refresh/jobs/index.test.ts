import { describe, expect, it } from "bun:test";
import { refreshRequestKinds } from "@hhuacm-dashboard/db/schema/refresh-request";

import type { RefreshRequestKind } from "../request-store";
import { findRefreshJobDefinition, refreshJobDefinitions } from "./index";

describe("refresh job definitions", () => {
  it("registers exactly one handler for every refresh request kind", () => {
    const registeredKinds = refreshJobDefinitions.map((job) => job.kind);

    expect(new Set(registeredKinds).size).toBe(registeredKinds.length);
    expect([...registeredKinds].sort()).toEqual(
      [...refreshRequestKinds].sort()
    );

    for (const kind of refreshRequestKinds) {
      expect(findRefreshJobDefinition(refreshJobDefinitions, kind).kind).toBe(
        kind
      );
    }
  });

  it("rejects unsupported refresh request kinds", () => {
    expect(() =>
      findRefreshJobDefinition(
        refreshJobDefinitions,
        "unknown.kind" as RefreshRequestKind
      )
    ).toThrow("Unsupported refresh request kind: unknown.kind");
  });
});
