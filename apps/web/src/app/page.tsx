"use client";

import { useQuery } from "@tanstack/react-query";

import { trpc } from "@/utils/trpc";

const statusLabel = (isLoading: boolean, isError: boolean) => {
  if (isLoading) {
    return "Connecting";
  }

  if (isError) {
    return "Unavailable";
  }

  return "Online";
};

export default function Home() {
  const runtimeInfo = useQuery(trpc.runtimeInfo.queryOptions());
  const status = statusLabel(runtimeInfo.isLoading, runtimeInfo.isError);

  return (
    <main className="min-h-svh bg-background text-foreground">
      <section className="mx-auto flex min-h-svh w-full max-w-5xl flex-col justify-center px-6 py-12">
        <div className="max-w-2xl">
          <p className="font-medium text-muted-foreground text-sm uppercase tracking-[0.18em]">
            HHU ACM
          </p>
          <h1 className="mt-4 font-semibold text-4xl tracking-normal sm:text-6xl">
            Dashboard workspace is ready.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground leading-8">
            A clean starting point for the HHU ACM dashboard, connected to the
            backend through tRPC.
          </p>
        </div>

        <div className="mt-12 max-w-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-medium text-lg">Backend Runtime</h2>
              <p className="mt-1 text-muted-foreground text-sm">
                Fetched from the API server.
              </p>
            </div>
            <span className="border px-3 py-1 font-medium text-sm">
              {status}
            </span>
          </div>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground text-sm">Service</dt>
              <dd className="mt-1 font-medium">
                {runtimeInfo.data?.service ?? "-"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-sm">Runtime</dt>
              <dd className="mt-1 font-medium">
                {runtimeInfo.data
                  ? `${runtimeInfo.data.runtime} ${runtimeInfo.data.version}`
                  : "-"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-sm">Environment</dt>
              <dd className="mt-1 font-medium">
                {runtimeInfo.data?.environment ?? "-"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-sm">Checked At</dt>
              <dd className="mt-1 font-medium">
                {runtimeInfo.data?.checkedAt ?? "-"}
              </dd>
            </div>
          </dl>

          {runtimeInfo.isError ? (
            <p className="mt-6 border border-destructive/30 bg-destructive/10 p-3 text-destructive text-sm">
              Could not reach the backend. Start the API server with{" "}
              <code>bun run dev:server</code>.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
