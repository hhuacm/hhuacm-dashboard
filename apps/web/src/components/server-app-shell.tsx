import type { ReactNode } from "react";

import { AppShellHeaderActions, AppShellNavigation } from "./app-shell";
import { AppShellLayout, type AppShellMaxWidth } from "./app-shell-layout";

interface ServerAppShellProps {
  children: ReactNode;
  description?: string;
  icon: ReactNode;
  maxWidth?: AppShellMaxWidth;
  title: string;
}

export function ServerAppShell({
  children,
  description,
  icon,
  maxWidth = "6xl",
  title,
}: ServerAppShellProps) {
  return (
    <AppShellLayout
      description={description}
      headerActions={<AppShellHeaderActions />}
      icon={icon}
      maxWidth={maxWidth}
      navigation={<AppShellNavigation />}
      title={title}
    >
      {children}
    </AppShellLayout>
  );
}
