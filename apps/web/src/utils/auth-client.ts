import type { Auth } from "@hhuacm-dashboard/auth";
import {
  inferAdditionalFields,
  usernameClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<Auth>(), usernameClient()],
});

interface UserNameFields {
  username?: null | string;
}

export const getUsernameLabel = (user: UserNameFields) =>
  user.username ?? "未设置";
