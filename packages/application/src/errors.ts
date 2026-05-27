export const applicationErrorCodes = [
  "BAD_REQUEST",
  "CONFLICT",
  "FORBIDDEN",
  "INTERNAL_SERVER_ERROR",
  "NOT_FOUND",
] as const;

export type ApplicationErrorCode = (typeof applicationErrorCodes)[number];

export class ApplicationError extends Error {
  readonly code: ApplicationErrorCode;

  constructor(input: { code: ApplicationErrorCode; message?: string }) {
    super(input.message ?? input.code);
    this.name = "ApplicationError";
    this.code = input.code;
  }
}

export const isApplicationError = (error: unknown): error is ApplicationError =>
  error instanceof ApplicationError;
