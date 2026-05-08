import type { ReactNode } from "react";

interface PageHeaderProps {
  action?: ReactNode;
  description: string;
  eyebrow?: string;
  title: string;
}

export function PageHeader({
  action,
  description,
  eyebrow,
  title,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="font-medium text-muted-foreground text-sm">{eyebrow}</p>
        ) : null}
        <h1 className="mt-2 text-balance font-semibold text-3xl tracking-normal sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-base text-muted-foreground leading-7">
          {description}
        </p>
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
