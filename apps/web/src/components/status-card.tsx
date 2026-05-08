import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@hhuacm-dashboard/ui/components/card";
import { cn } from "@hhuacm-dashboard/ui/lib/utils";
import type { ReactNode } from "react";

const toneClassNames = {
  danger: "bg-destructive/10 text-destructive",
  info: "bg-primary/10 text-primary",
  neutral: "bg-muted text-muted-foreground",
  success:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  warning:
    "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
} as const;

interface StatusCardProps {
  description: string;
  icon?: ReactNode;
  title: string;
  tone?: keyof typeof toneClassNames;
  value: ReactNode;
}

export function StatusCard({
  description,
  icon,
  title,
  tone = "neutral",
  value,
}: StatusCardProps) {
  return (
    <Card size="sm">
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardDescription>{title}</CardDescription>
            <CardTitle className="mt-1 text-xl">{value}</CardTitle>
          </div>
          {icon ? (
            <div
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-md",
                toneClassNames[tone]
              )}
            >
              {icon}
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm leading-6">{description}</p>
      </CardContent>
    </Card>
  );
}
