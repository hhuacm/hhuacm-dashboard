import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { authClient } from "@/utils/auth-client";
import { trpc } from "@/utils/trpc";

const adminAccessRedirectDelayMs = 3000;

export type AdminAccessStatus =
  | "admin"
  | "checking"
  | "error"
  | "guest"
  | "member";

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
  const status: AdminAccessStatus = (() => {
    if (session.isPending || (user && accountMe.isPending)) {
      return "checking";
    }

    if (!user) {
      return "guest";
    }

    if (accountMe.isError || !accountMe.data) {
      return "error";
    }

    return accountMe.data.role === "admin" ? "admin" : "member";
  })();

  useEffect(() => {
    if (status === "guest") {
      const timeoutId = window.setTimeout(() => {
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      }, adminAccessRedirectDelayMs);

      return () => window.clearTimeout(timeoutId);
    }

    if (status === "member") {
      const timeoutId = window.setTimeout(() => {
        router.push("/");
      }, adminAccessRedirectDelayMs);

      return () => window.clearTimeout(timeoutId);
    }
  }, [pathname, router, status]);

  return {
    isAdmin: status === "admin",
    status,
  };
}
