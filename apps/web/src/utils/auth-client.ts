import { env } from "@hhuacm-dashboard/env/web";
import { usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  basePath: "/api/auth",
  baseURL: env.NEXT_PUBLIC_SERVER_URL,
  plugins: [usernameClient()],
});

interface UserNameFields {
  displayUsername?: null | string;
  name: string;
  username?: null | string;
}

export const getPreferredUsername = (user: UserNameFields) =>
  user.displayUsername ?? user.username ?? user.name;
