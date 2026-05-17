import { publicProcedure, router } from "../index";
import { getPublicProfile } from "../services/profile";
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
