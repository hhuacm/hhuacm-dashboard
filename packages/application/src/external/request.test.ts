import { describe, expect, it } from "bun:test";

import { requestExternalResource } from "./request";

const requestResource = (
  responses: Array<Error | Response>,
  input: {
    label?: string;
  } = {}
) => {
  const requests: AbortSignal[] = [];

  return {
    requests,
    response: requestExternalResource({
      label: input.label ?? "Contest source",
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
    }),
  };
};

describe("requestExternalResource", () => {
  it("retries transient request failures", async () => {
    const expectedResponse = Response.json({ ok: true });
    const request = requestResource([
      new Error("network failed"),
      expectedResponse,
    ]);

    await expect(request.response).resolves.toEqual({
      body: '{"ok":true}',
      headers: expectedResponse.headers,
      ok: true,
      status: 200,
    });
    expect(request.requests).toHaveLength(2);
  });

  it("retries response body failures before returning a completed resource", async () => {
    const interruptedBody = new ReadableStream({
      pull(controller) {
        controller.error(new Error("connection closed while reading body"));
      },
      start(controller) {
        controller.enqueue(new TextEncoder().encode("["));
      },
    });
    const request = requestResource([
      new Response(interruptedBody),
      Response.json([]),
    ]);

    await expect(request.response).resolves.toMatchObject({
      body: "[]",
      ok: true,
      status: 200,
    });
    expect(request.requests).toHaveLength(2);
  });

  it("cancels discarded response bodies before retrying HTTP status failures", async () => {
    const cancelledStatuses: number[] = [];
    const failures = [429, 502].map(
      (status) =>
        new Response(
          new ReadableStream({
            cancel() {
              cancelledStatuses.push(status);
            },
          }),
          { status }
        )
    );
    const expectedResponse = Response.json({ ok: true });
    const request = requestResource([...failures, expectedResponse]);

    await expect(request.response).resolves.toMatchObject({
      body: '{"ok":true}',
      ok: true,
      status: 200,
    });
    expect(cancelledStatuses).toEqual([429, 502]);
    expect(request.requests).toHaveLength(3);
  });

  it.each([404, 302])("preserves HTTP %i and headers", async (status) => {
    const expectedResponse = new Response(
      new ReadableStream({
        start(controller) {
          controller.error(new Error("body connection failed"));
        },
      }),
      {
        headers: {
          location: "/destination",
          "set-cookie": "C3VK=fixture; Path=/",
        },
        status,
      }
    );
    const request = requestResource([expectedResponse]);

    await expect(request.response).resolves.toEqual({
      headers: expectedResponse.headers,
      ok: false,
      status,
    });
    expect(request.requests).toHaveLength(1);
  });

  it("reports the label, attempt count, and final error after all attempts fail", async () => {
    const request = requestResource(
      [
        new Error("network failed"),
        Response.json({}, { status: 502 }),
        Response.json({}, { status: 502 }),
      ],
      { label: "OJ profile" }
    );

    await expect(request.response).rejects.toThrow(
      "OJ profile request failed after 3 attempts: HTTP 502"
    );
    expect(request.requests).toHaveLength(3);
  });
});
