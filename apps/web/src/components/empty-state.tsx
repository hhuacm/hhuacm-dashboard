import type { ReactNode } from "react";

interface EmptyStateProps {
  action?: ReactNode;
  description: string;
  icon?: ReactNode;
  title: string;
}

export function EmptyState({
  action,
  description,
  icon,
  title,
}: EmptyStateProps) {
  return (
    <div className="grid gap-5 py-4">
      <div className="flex items-start gap-4">
        {icon ? (
          <div className="grid size-11 shrink-0 place-items-center rounded-lg border bg-muted text-primary">
            {icon}
          </div>
        ) : null}
        <div>
          <h2 className="font-semibold text-2xl">{title}</h2>
          <p className="mt-2 max-w-xl text-muted-foreground leading-7">
            {description}
          </p>
        </div>
      </div>

      {action ? <div>{action}</div> : null}
    </div>
  );
}
