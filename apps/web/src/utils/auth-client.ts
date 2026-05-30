import { usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  basePath: "/api/auth",
  plugins: [usernameClient()],
});

interface UserNameFields {
  username?: null | string;
}

export const getUsernameLabel = (user: UserNameFields) =>
  user.username ?? "未设置";
