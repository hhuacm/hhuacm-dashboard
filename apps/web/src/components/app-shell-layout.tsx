import clsx from "clsx";
import type { ReactNode } from "react";

const maxWidthClassNames = {
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
} as const;
const shellMaxWidthClassName = maxWidthClassNames["6xl"];

export type AppShellMaxWidth = keyof typeof maxWidthClassNames;

interface AppShellLayoutProps {
  children: ReactNode;
  description?: string;
  headerActions: ReactNode;
  icon: ReactNode;
  maxWidth?: AppShellMaxWidth;
  navigation: ReactNode;
  title: string;
}

export function AppShellLayout({
  children,
  description,
  headerActions,
  icon,
  maxWidth = "6xl",
  navigation,
  title,
}: AppShellLayoutProps) {
  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="flex min-h-svh flex-col py-4">
        <div
          className={clsx(
            "mx-auto w-full px-4 sm:px-6 lg:px-8",
            shellMaxWidthClassName
          )}
        >
          <header className="flex min-h-16 flex-wrap items-center justify-between gap-4 border-b py-3">
            <div className="flex min-w-0 flex-wrap items-center gap-4">
              <div className="flex min-w-0 items-center gap-3 sm:w-56 sm:shrink-0">
                <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-border bg-surface text-accent shadow-surface">
                  {icon}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-base leading-none">
                    {title}
                  </p>
                  {description ? (
                    <p className="mt-1 truncate text-muted text-sm">
                      {description}
                    </p>
                  ) : null}
                </div>
              </div>

              {navigation}
            </div>

            <div className="shrink-0">{headerActions}</div>
          </header>
        </div>

        <div
          className={clsx(
            "mx-auto w-full flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8",
            maxWidthClassNames[maxWidth]
          )}
        >
          {children}
        </div>
      </div>
    </main>
  );
}
