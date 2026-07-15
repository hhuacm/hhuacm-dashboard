import { setTimeout as sleep } from "node:timers/promises";

interface ExternalRequestOptions {
  label: string;
  maxAttempts?: number;
  request: (signal: AbortSignal) => Promise<Response>;
  retryableStatus?: (status: number) => boolean;
  retryDelayMs?: number;
  timeoutMs?: number;
}

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown external request error";

export const isCommonRetryableHttpStatus = (status: number) =>
  status === 429 || status >= 500;

export const requestExternalResource = async ({
  label,
  maxAttempts = 3,
  request,
  retryDelayMs = 500,
  retryableStatus = isCommonRetryableHttpStatus,
  timeoutMs = 10_000,
}: ExternalRequestOptions) => {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await request(AbortSignal.timeout(timeoutMs));

      if (response.ok || !retryableStatus(response.status)) {
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
