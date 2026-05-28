import {
  isValidGradeOption,
  memberStatuses,
  ojPlatforms,
} from "@hhuacm-dashboard/domain";
import { z } from "zod";

export const trimmedStringSchema = z.string().trim().min(1);

export const gradeSchema = z
  .string()
  .refine((grade) => !grade || isValidGradeOption(grade), {
    message: "Invalid grade",
  });

export const profileInputSchema = z.object({
  grade: gradeSchema,
  major: z.string(),
  realName: z.string(),
  studentId: z.string(),
});

export const profileUpdateInputSchema = profileInputSchema
  .partial()
  .refine((input) => Object.keys(input).length > 0, {
    message: "Profile update requires at least one field",
  });

export const ojPlatformSchema = z.enum(ojPlatforms);

export const ojAccountInputSchema = z.object({
  externalId: trimmedStringSchema,
  platform: ojPlatformSchema,
});

export const ojAccountPlatformInputSchema = z.object({
  platform: ojPlatformSchema,
});

export const profileGetInputSchema = z.object({
  username: trimmedStringSchema,
});

export const adminUserInputSchema = z.object({
  userId: trimmedStringSchema,
});

const adminUsersSortColumnSchema = z.enum([
  "email",
  "grade",
  "major",
  "memberStatus",
  "realName",
  "studentId",
  "username",
]);

const adminUsersSortDirectionSchema = z.enum(["ascending", "descending"]);

export const adminUsersListInputSchema = z.object({
  filters: z
    .object({
      grades: z.array(z.string().trim().min(1)).optional(),
      memberStatuses: z.array(z.enum(memberStatuses)).optional(),
      ojPlatforms: z.array(z.enum(ojPlatforms)).optional(),
    })
    .optional(),
  sort: z
    .object({
      column: adminUsersSortColumnSchema,
      direction: adminUsersSortDirectionSchema,
    })
    .optional(),
});

export const adminUserDeleteInputSchema = adminUserInputSchema.extend({
  usernameConfirmation: trimmedStringSchema,
});

const adminProfileInputSchema = profileInputSchema.extend({
  memberStatus: z.enum(memberStatuses),
});

const adminProfileUpdateInputSchema = adminProfileInputSchema
  .partial()
  .refine((input) => Object.keys(input).length > 0, {
    message: "Profile update requires at least one field",
  });

export const adminUserProfileUpdateInputSchema = adminUserInputSchema.extend({
  values: adminProfileUpdateInputSchema,
});

export const adminUserOjAccountInputSchema = adminUserInputSchema.extend({
  externalId: trimmedStringSchema,
  platform: ojPlatformSchema,
});

export const adminUserOjAccountDeleteInputSchema = adminUserInputSchema.extend({
  platform: ojPlatformSchema,
});

export const problemSetIdInputSchema = z.object({
  id: trimmedStringSchema,
});

const problemSetPidSchema = trimmedStringSchema;

export const adminProblemSetInputSchema = z.object({
  descriptionMarkdown: z.string(),
  pids: z.array(problemSetPidSchema).min(1),
  title: trimmedStringSchema,
});

export const adminProblemSetUpdateInputSchema = problemSetIdInputSchema
  .extend({
    descriptionMarkdown: z.string().optional(),
    pids: z.array(problemSetPidSchema).min(1).optional(),
    title: trimmedStringSchema.optional(),
  })
  .refine(
    (input) =>
      input.descriptionMarkdown !== undefined ||
      input.pids !== undefined ||
      input.title !== undefined,
    {
      message: "Problem set update requires at least one field",
    }
  );

export const adminHomeNoticeInputSchema = z.object({
  markdown: z.string(),
});
