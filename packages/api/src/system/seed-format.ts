import { createHash } from "node:crypto";
import {
  type MemberStatus,
  memberStatuses,
  type OjPlatform,
  ojPlatforms,
} from "@hhuacm-dashboard/domain";
import { z } from "zod";

export const systemSeedKind = "hhuacm-dashboard.system-seed";
export const systemSeedVersion = 1;

export interface SystemSeedOjAccount {
  handle: string;
  platform: OjPlatform;
}

export interface SystemSeedUserProfile {
  grade?: string;
  major?: string;
  memberStatus?: MemberStatus;
  realName?: string;
  studentId?: string;
}

export interface SystemSeedUser {
  email: string;
  ojAccounts?: SystemSeedOjAccount[];
  profile?: SystemSeedUserProfile;
  role?: "admin";
  username: string;
}

export interface SystemSeedProblemSet {
  descriptionMarkdown?: string;
  pids: string[];
  title: string;
}

export interface SystemSeedSettings {
  homeNoticeMarkdown?: string;
}

export interface SystemSeed {
  problemSets: SystemSeedProblemSet[];
  settings: SystemSeedSettings;
  users: SystemSeedUser[];
}

export interface SystemSeedHashPayload {
  kind: typeof systemSeedKind;
  seed: SystemSeed;
  version: typeof systemSeedVersion;
}

export interface SystemSeedFile extends SystemSeedHashPayload {
  exportedAt: string;
  hash: string;
}

export class SystemSeedFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SystemSeedFormatError";
  }
}

const nonEmptyStringSchema = z.string().min(1);

const systemSeedOjAccountSchema = z
  .object({
    handle: nonEmptyStringSchema,
    platform: z.enum(ojPlatforms),
  })
  .strict();

const systemSeedUserProfileSchema = z
  .object({
    grade: nonEmptyStringSchema.optional(),
    major: nonEmptyStringSchema.optional(),
    memberStatus: z.enum(memberStatuses).optional(),
    realName: nonEmptyStringSchema.optional(),
    studentId: nonEmptyStringSchema.optional(),
  })
  .strict();

const systemSeedUserSchema = z
  .object({
    email: nonEmptyStringSchema,
    ojAccounts: z.array(systemSeedOjAccountSchema).optional(),
    profile: systemSeedUserProfileSchema.optional(),
    role: z.literal("admin").optional(),
    username: nonEmptyStringSchema,
  })
  .strict();

const systemSeedProblemSetSchema = z
  .object({
    descriptionMarkdown: z.string().optional(),
    pids: z.array(nonEmptyStringSchema),
    title: nonEmptyStringSchema,
  })
  .strict();

const systemSeedSettingsSchema = z
  .object({
    homeNoticeMarkdown: z.string().optional(),
  })
  .strict();

export const systemSeedSchema = z
  .object({
    problemSets: z.array(systemSeedProblemSetSchema),
    settings: systemSeedSettingsSchema,
    users: z.array(systemSeedUserSchema),
  })
  .strict();

const systemSeedFileSchema = z
  .object({
    exportedAt: nonEmptyStringSchema,
    hash: nonEmptyStringSchema,
    kind: z.literal(systemSeedKind),
    seed: systemSeedSchema,
    version: z.literal(systemSeedVersion),
  })
  .strict();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const canonicalize = (value: unknown): unknown => {
  if (!(value && typeof value === "object")) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (!isRecord(value)) {
    return value;
  }

  return Object.keys(value)
    .sort((left, right) => left.localeCompare(right))
    .reduce<Record<string, unknown>>((result, key) => {
      const nextValue = value[key];

      if (nextValue !== undefined) {
        result[key] = canonicalize(nextValue);
      }

      return result;
    }, {});
};

export const stringifyCanonicalJson = (value: unknown) =>
  JSON.stringify(canonicalize(value));

export const hashCanonicalJson = (value: unknown) =>
  createHash("sha256").update(stringifyCanonicalJson(value)).digest("hex");

export const createSystemSeedHashPayload = (
  seed: SystemSeed
): SystemSeedHashPayload => ({
  kind: systemSeedKind,
  seed,
  version: systemSeedVersion,
});

export const hashSystemSeed = (seed: SystemSeed) =>
  hashCanonicalJson(createSystemSeedHashPayload(seed));

export const createSystemSeedFile = (
  seed: SystemSeed,
  exportedAt = new Date().toISOString()
): SystemSeedFile => ({
  ...createSystemSeedHashPayload(seed),
  exportedAt,
  hash: hashSystemSeed(seed),
});

const formatZodError = (error: z.ZodError) =>
  error.issues
    .map((issue) => {
      const path = issue.path.join(".") || "<root>";

      return `${path}: ${issue.message}`;
    })
    .join("; ");

export const parseSystemSeedFile = (value: unknown): SystemSeedFile => {
  const result = systemSeedFileSchema.safeParse(value);

  if (!result.success) {
    throw new SystemSeedFormatError(
      `Invalid system seed file: ${formatZodError(result.error)}`
    );
  }

  const expectedHash = hashSystemSeed(result.data.seed);

  if (result.data.hash !== expectedHash) {
    throw new SystemSeedFormatError("Invalid system seed hash.");
  }

  return result.data;
};
