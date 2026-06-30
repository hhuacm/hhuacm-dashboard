import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { authClient } from "@/utils/auth-client";
import { trpc } from "@/utils/trpc";

const adminAccessRedirectDelayMs = 3000;

export function useAdminAccess() {
  const pathname = usePathname();
  const router = useRouter();
  const session = authClient.useSession();
  const user = session.data?.user ?? null;
  const accountMe = useQuery(
    trpc.account.me.queryOptions(undefined, {
      enabled: Boolean(user),
      retry: false,
    })
  );
  const isAdmin = accountMe.data?.role === "admin";
  const isMember = Boolean(accountMe.data && !isAdmin);
  const isCheckingAccess =
    session.isPending || (Boolean(user) && accountMe.isPending);
  const shouldPromptLogin = !(session.isPending || user);

  useEffect(() => {
    if (session.isPending) {
      return;
    }

    if (!user) {
      const timeoutId = window.setTimeout(() => {
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      }, adminAccessRedirectDelayMs);

      return () => window.clearTimeout(timeoutId);
    }

    if (isMember) {
      const timeoutId = window.setTimeout(() => {
        router.push("/");
      }, adminAccessRedirectDelayMs);

      return () => window.clearTimeout(timeoutId);
    }
  }, [isMember, pathname, router, session.isPending, user]);

  return {
    accountMe,
    isAdmin,
    isCheckingAccess,
    isMember,
    shouldPromptLogin,
  };
}
