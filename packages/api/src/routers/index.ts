import { router } from "../index";
import { adminRouter } from "./admin";
import { dashboardRouter } from "./dashboard";
import { problemSetRouter } from "./problem-set";
import { profileRouter } from "./profile";
import { rankRouter } from "./rank";
import { settingsRouter } from "./settings";

export const appRouter = router({
  admin: adminRouter,
  dashboard: dashboardRouter,
  problemSet: problemSetRouter,
  profile: profileRouter,
  rank: rankRouter,
  settings: settingsRouter,
});

export type AppRouter = typeof appRouter;
