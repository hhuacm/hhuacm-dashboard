import {
  atcoderAccountStats,
  atcoderAccountStatsRelations,
} from "./atcoder-account-stats";
import {
  account,
  accountRelations,
  session,
  sessionRelations,
  user,
  userRelations,
  verification,
} from "./auth";
import {
  codeforcesAccountStats,
  codeforcesAccountStatsRelations,
} from "./codeforces-account-stats";
import { currentMember } from "./current-member";
import {
  luoguAcceptedProblem,
  luoguAcceptedProblemRelations,
  luoguAccountStats,
  luoguAccountStatsRelations,
} from "./luogu-account-stats";
import {
  nowcoderAccountStats,
  nowcoderAccountStatsRelations,
} from "./nowcoder-account-stats";
import { userOjAccount, userOjAccountRelations } from "./oj-account";
import {
  problemSet,
  problemSetProblem,
  problemSetProblemRelations,
  problemSetRelations,
} from "./problem-set";
import { userProfile, userProfileRelations } from "./profile";
import { refreshRequest, refreshRequestRelations } from "./refresh-request";
import { siteSetting } from "./site-setting";
import {
  userAward,
  userAwardRelations,
  userAwardSync,
  userAwardSyncRelations,
} from "./user-award";

export const schema = {
  account,
  accountRelations,
  atcoderAccountStats,
  atcoderAccountStatsRelations,
  codeforcesAccountStats,
  codeforcesAccountStatsRelations,
  currentMember,
  luoguAcceptedProblem,
  luoguAcceptedProblemRelations,
  luoguAccountStats,
  luoguAccountStatsRelations,
  nowcoderAccountStats,
  nowcoderAccountStatsRelations,
  problemSet,
  problemSetProblem,
  problemSetProblemRelations,
  problemSetRelations,
  refreshRequest,
  refreshRequestRelations,
  session,
  sessionRelations,
  siteSetting,
  user,
  userAward,
  userAwardRelations,
  userAwardSync,
  userAwardSyncRelations,
  userOjAccount,
  userOjAccountRelations,
  userProfile,
  userProfileRelations,
  userRelations,
  verification,
} as const;
