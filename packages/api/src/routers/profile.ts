import { getPublicProfile } from "@hhuacm-dashboard/application/services/profile";
import { publicProcedure, router } from "../index";
import { profileGetInputSchema } from "./schemas";

export const profileRouter = router({
  get: publicProcedure.input(profileGetInputSchema).query(
    async ({ ctx, input }) =>
      await getPublicProfile(ctx.db, {
        currentUserId: ctx.session?.user.id ?? null,
        username: input.username,
      })
  ),
});
