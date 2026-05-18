import { describe, expect, it, mock } from "bun:test";

import {
  isCommonRetryableHttpStatus,
  requestExternalResource,
} from "./request";

const requestDefaults = {
  maxAttempts: 3,
  retryDelayMs: 0,
  retryableStatus: isCommonRetryableHttpStatus,
  timeoutMs: 1000,
} as const;

describe("requestExternalResource", () => {
  it("retries thrown request failures", async () => {
    const request = mock((_signal: AbortSignal) =>
      request.mock.calls.length === 1
        ? Promise.reject(new Error("Unable to connect"))
        : Promise.resolve(Response.json({ ok: true }))
    );

    const response = await requestExternalResource({
      ...requestDefaults,
      label: "Test resource",
      request,
    });

    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("retries retryable HTTP responses", async () => {
    const request = mock(() =>
      request.mock.calls.length === 1
        ? Promise.resolve(Response.json({}, { status: 502 }))
        : Promise.resolve(Response.json({ ok: true }))
    );

    const response = await requestExternalResource({
      ...requestDefaults,
      label: "Test resource",
      request,
    });

    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("returns non-retryable HTTP responses without retrying", async () => {
    const request = mock(() =>
      Promise.resolve(Response.json({ forbidden: true }, { status: 403 }))
    );

    const response = await requestExternalResource({
      ...requestDefaults,
      label: "Test resource",
      request,
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ forbidden: true });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("throws contextual errors after exhausting attempts", async () => {
    const request = mock(() => Promise.reject(new Error("network failed")));

    await expect(
      requestExternalResource({
        ...requestDefaults,
        label: "Test resource",
        request,
      })
    ).rejects.toThrow(
      "Test resource request failed after 3 attempts: network failed"
    );
    expect(request).toHaveBeenCalledTimes(3);
  });

  it("throws contextual errors after exhausting retryable HTTP responses", async () => {
    const request = mock(() =>
      Promise.resolve(Response.json({}, { status: 502 }))
    );

    await expect(
      requestExternalResource({
        ...requestDefaults,
        label: "Test resource",
        request,
      })
    ).rejects.toThrow(
      "Test resource request failed after 3 attempts: HTTP 502"
    );
    expect(request).toHaveBeenCalledTimes(3);
  });

  it("passes a timeout signal to every request attempt", async () => {
    const signals: AbortSignal[] = [];
    const request = mock((signal: AbortSignal) => {
      signals.push(signal);

      return Promise.resolve(Response.json({ ok: true }));
    });

    await requestExternalResource({
      ...requestDefaults,
      label: "Test resource",
      request,
      timeoutMs: 1234,
    });

    expect(signals).toHaveLength(1);
    expect(signals[0]).toBeInstanceOf(AbortSignal);
  });
});
