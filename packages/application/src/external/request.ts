import { setTimeout as sleep } from "node:timers/promises";

interface ExternalRequestOptions {
  label: string;
  request: (signal: AbortSignal) => Promise<Response>;
  retryDelayMs?: number;
  timeoutMs?: number;
}

const maxAttempts = 3;

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown external request error";

const isCommonRetryableHttpStatus = (status: number) =>
  status === 429 || status >= 500;

export const requestExternalResource = async ({
  label,
  request,
  retryDelayMs = 500,
  timeoutMs = 10_000,
}: ExternalRequestOptions) => {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await request(AbortSignal.timeout(timeoutMs));

      if (response.ok) {
        return {
          body: await response.text(),
          headers: response.headers,
          ok: true as const,
          status: response.status,
        };
      }

      await response.body?.cancel().catch(() => {
        // An unused body's failure must not replace the received HTTP status.
      });

      if (!isCommonRetryableHttpStatus(response.status)) {
        return {
          headers: response.headers,
          ok: false as const,
          status: response.status,
        };
      }

      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    if (attempt < maxAttempts) {
      await sleep(retryDelayMs);
    }
  }

  throw new Error(
    `${label} request failed after ${maxAttempts} attempts: ${getErrorMessage(
      lastError
    )}`
  );
};
