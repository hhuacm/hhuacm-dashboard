import type { ReactNode } from "react";

export function InfoItem({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <dt className="text-muted text-sm">{label}</dt>
      <dd className="mt-2 break-all font-medium text-base text-foreground">
        {value}
      </dd>
    </div>
  );
}
