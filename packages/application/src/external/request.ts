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

      if (response.ok || !isCommonRetryableHttpStatus(response.status)) {
        return response;
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
