import {
  addOjAccount,
  deleteOjAccount,
  updateOjAccount,
} from "@hhuacm-dashboard/application/services/oj-account/commands";
import {
  getSettingsProfile,
  updateUserProfile,
} from "@hhuacm-dashboard/application/services/profile";
import { protectedProcedure, router } from "../index";
import {
  ojAccountInputSchema,
  ojAccountPlatformInputSchema,
  profileUpdateInputSchema,
} from "./schemas";

export const settingsRouter = router({
  profile: router({
    get: protectedProcedure.query(
      async ({ ctx }) => await getSettingsProfile(ctx.db, ctx.session.user.id)
    ),
    update: protectedProcedure.input(profileUpdateInputSchema).mutation(
      async ({ ctx, input }) =>
        await updateUserProfile(ctx.db, {
          notFoundCode: "NOT_FOUND",
          userId: ctx.session.user.id,
          values: input,
        })
    ),
  }),
  ojAccount: router({
    add: protectedProcedure.input(ojAccountInputSchema).mutation(
      async ({ ctx, input }) =>
        await addOjAccount(ctx.db, {
          externalId: input.externalId,
          platform: input.platform,
          userId: ctx.session.user.id,
        })
    ),
    update: protectedProcedure.input(ojAccountInputSchema).mutation(
      async ({ ctx, input }) =>
        await updateOjAccount(ctx.db, {
          externalId: input.externalId,
          platform: input.platform,
          userId: ctx.session.user.id,
        })
    ),
    delete: protectedProcedure.input(ojAccountPlatformInputSchema).mutation(
      async ({ ctx, input }) =>
        await deleteOjAccount(ctx.db, {
          platform: input.platform,
          userId: ctx.session.user.id,
        })
    ),
  }),
});
