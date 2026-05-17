import { protectedProcedure, router } from "../index";
import { getCurrentUser } from "../services/account";

export const accountRouter = router({
  me: protectedProcedure.query(
    async ({ ctx }) => await getCurrentUser(ctx.db, ctx.session.user.id)
  ),
});
