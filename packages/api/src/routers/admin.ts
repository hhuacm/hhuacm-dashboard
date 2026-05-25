import { adminProcedure, router } from "../index";
import { exportAdminSystem } from "../services/admin-export";
import { deleteAdminUser } from "../services/admin-users/delete-user";
import { getAdminUser } from "../services/admin-users/detail";
import { listAdminUsers } from "../services/admin-users/list-query";
import { getAdminUsersMetadata } from "../services/admin-users/metadata";
import {
  deleteOjAccount,
  upsertOjAccount,
} from "../services/oj-account/commands";
import {
  createProblemSet,
  deleteProblemSet,
  updateProblemSet,
} from "../services/problem-set/mutation";
import { getTargetUser, updateUserProfile } from "../services/profile";
import { updateHomeNoticeMarkdown } from "../services/site-setting";
import {
  adminHomeNoticeInputSchema,
  adminProblemSetInputSchema,
  adminProblemSetUpdateInputSchema,
  adminUserDeleteInputSchema,
  adminUserInputSchema,
  adminUserOjAccountDeleteInputSchema,
  adminUserOjAccountInputSchema,
  adminUserProfileUpdateInputSchema,
  adminUsersListInputSchema,
  problemSetIdInputSchema,
} from "./schemas";

export const adminRouter = router({
  export: adminProcedure.query(
    async ({ ctx }) => await exportAdminSystem(ctx.db)
  ),
  problemSets: router({
    create: adminProcedure
      .input(adminProblemSetInputSchema)
      .mutation(
        async ({ ctx, input }) => await createProblemSet(ctx.db, input)
      ),
    delete: adminProcedure
      .input(problemSetIdInputSchema)
      .mutation(
        async ({ ctx, input }) => await deleteProblemSet(ctx.db, input.id)
      ),
    update: adminProcedure
      .input(adminProblemSetUpdateInputSchema)
      .mutation(
        async ({ ctx, input }) => await updateProblemSet(ctx.db, input)
      ),
  }),
  siteSettings: router({
    updateHomeNotice: adminProcedure
      .input(adminHomeNoticeInputSchema)
      .mutation(async ({ ctx, input }) => ({
        markdown: await updateHomeNoticeMarkdown(ctx.db, input.markdown),
      })),
  }),
  users: router({
    get: adminProcedure
      .input(adminUserInputSchema)
      .query(
        async ({ ctx, input }) => await getAdminUser(ctx.db, input.userId)
      ),
    list: adminProcedure
      .input(adminUsersListInputSchema)
      .query(async ({ ctx, input }) => await listAdminUsers(ctx.db, input)),
    metadata: adminProcedure.query(
      async ({ ctx }) => await getAdminUsersMetadata(ctx.db)
    ),
    delete: adminProcedure.input(adminUserDeleteInputSchema).mutation(
      async ({ ctx, input }) =>
        await deleteAdminUser(ctx.db, {
          userId: input.userId,
          usernameConfirmation: input.usernameConfirmation,
        })
    ),
    updateProfile: adminProcedure
      .input(adminUserProfileUpdateInputSchema)
      .mutation(
        async ({ ctx, input }) =>
          await updateUserProfile(ctx.db, {
            notFoundCode: "INTERNAL_SERVER_ERROR",
            userId: input.userId,
            values: input.values,
          })
      ),
    upsertOjAccount: adminProcedure
      .input(adminUserOjAccountInputSchema)
      .mutation(async ({ ctx, input }) => {
        await getTargetUser(ctx.db, input.userId);

        return await upsertOjAccount(ctx.db, {
          handle: input.handle,
          platform: input.platform,
          userId: input.userId,
        });
      }),
    deleteOjAccount: adminProcedure
      .input(adminUserOjAccountDeleteInputSchema)
      .mutation(async ({ ctx, input }) => {
        await getTargetUser(ctx.db, input.userId);

        return await deleteOjAccount(ctx.db, {
          platform: input.platform,
          userId: input.userId,
        });
      }),
  }),
});
