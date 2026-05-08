import { cn } from "@hhuacm-dashboard/ui/lib/utils";
import type { ReactNode } from "react";

const maxWidthClassNames = {
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
} as const;

interface AppShellProps {
  action?: ReactNode;
  children: ReactNode;
  description: string;
  icon: ReactNode;
  maxWidth?: keyof typeof maxWidthClassNames;
  title: string;
}

export function AppShell({
  action,
  children,
  description,
  icon,
  maxWidth = "6xl",
  title,
}: AppShellProps) {
  return (
    <main className="min-h-svh bg-background text-foreground">
      <div
        className={cn(
          "mx-auto flex min-h-svh w-full flex-col px-4 py-4 sm:px-6 lg:px-8",
          maxWidthClassNames[maxWidth]
        )}
      >
        <header className="flex min-h-16 items-center justify-between gap-4 border-b py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-lg border bg-card text-primary shadow-sm">
              {icon}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-base leading-none">
                {title}
              </p>
              <p className="mt-1 truncate text-muted-foreground text-sm">
                {description}
              </p>
            </div>
          </div>

          {action ? <div className="shrink-0">{action}</div> : null}
        </header>

        <div className="flex-1 py-8 sm:py-10">{children}</div>
      </div>
    </main>
  );
}
