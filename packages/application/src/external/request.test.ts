import { describe, expect, it } from "bun:test";

import {
  isCommonRetryableHttpStatus,
  requestExternalResource,
} from "./request";

const requestResource = (
  responses: Array<Error | Response>,
  input: {
    label?: string;
    maxAttempts?: number;
    retryableStatus?: (status: number) => boolean;
  } = {}
) => {
  const requests: AbortSignal[] = [];

  return {
    requests,
    response: requestExternalResource({
      label: input.label ?? "Contest source",
      maxAttempts: input.maxAttempts,
      request: (signal) => {
        requests.push(signal);
        const response = responses.shift();

        if (response === undefined) {
          return Promise.reject(new Error("Unexpected extra request"));
        }

        if (response instanceof Error) {
          return Promise.reject(response);
        }

        return Promise.resolve(response);
      },
      retryDelayMs: 0,
      retryableStatus: input.retryableStatus,
    }),
  };
};

describe("requestExternalResource", () => {
  it("returns the first successful response without retrying", async () => {
    const expectedResponse = Response.json({ ok: true });
    const request = requestResource([expectedResponse]);

    await expect(request.response).resolves.toBe(expectedResponse);
    expect(request.requests).toHaveLength(1);
  });

  it("retries transient request failures", async () => {
    const expectedResponse = Response.json({ ok: true });
    const request = requestResource([
      new Error("network failed"),
      expectedResponse,
    ]);

    await expect(request.response).resolves.toBe(expectedResponse);
    expect(request.requests).toHaveLength(2);
  });

  it("retries retryable HTTP status responses", async () => {
    const expectedResponse = Response.json({ ok: true });
    const request = requestResource([
      Response.json({}, { status: 429 }),
      Response.json({}, { status: 502 }),
      expectedResponse,
    ]);

    await expect(request.response).resolves.toBe(expectedResponse);
    expect(request.requests).toHaveLength(3);
  });

  it("returns non-retryable HTTP status responses without retrying", async () => {
    const expectedResponse = Response.json({}, { status: 404 });
    const request = requestResource([expectedResponse]);

    await expect(request.response).resolves.toBe(expectedResponse);
    expect(request.requests).toHaveLength(1);
  });

  it("reports the label, attempt count, and final error after all attempts fail", async () => {
    const request = requestResource(
      [new Error("network failed"), Response.json({}, { status: 502 })],
      {
        label: "OJ profile",
        maxAttempts: 2,
      }
    );

    await expect(request.response).rejects.toThrow(
      "OJ profile request failed after 2 attempts: HTTP 502"
    );
    expect(request.requests).toHaveLength(2);
  });
});

describe("isCommonRetryableHttpStatus", () => {
  it("treats rate limits and 5xx responses as retryable", () => {
    expect(isCommonRetryableHttpStatus(429)).toBe(true);
    expect(isCommonRetryableHttpStatus(499)).toBe(false);
    expect(isCommonRetryableHttpStatus(500)).toBe(true);
  });
});
