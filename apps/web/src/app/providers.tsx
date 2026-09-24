"use client";

import type { AppRouter } from "@hhuacm-dashboard/api/routers/index";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { useRouter } from "next/navigation";
import { type ReactNode, Suspense, useEffect, useRef, useState } from "react";

import { authClient } from "@/utils/auth-client";
import { TRPCProvider } from "@/utils/trpc";

function SessionQueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [httpBatchLink({ url: "/trpc" })],
    })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider queryClient={queryClient} trpcClient={trpcClient}>
        <Suspense
          fallback={
            <div className="flex min-h-dvh items-center justify-center text-muted text-sm">
              正在加载页面。
            </div>
          }
        >
          {children}
        </Suspense>
      </TRPCProvider>
    </QueryClientProvider>
  );
}

export default function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();
  const session = authClient.useSession();
  const userId = session.data?.user.id ?? null;
  const previousUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (session.isPending) {
      return;
    }

    const previous = previousUserId.current;
    previousUserId.current = userId;

    if (previous !== undefined && previous !== userId) {
      router.refresh();
    }
  }, [router, session.isPending, userId]);

  return (
    <SessionQueryProvider key={userId ?? "anonymous"}>
      {children}
    </SessionQueryProvider>
  );
}
