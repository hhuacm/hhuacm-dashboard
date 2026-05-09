import type { ReactNode } from "react";

interface InfoItemProps {
  label: string;
  mono?: boolean;
  value: ReactNode;
}

export function InfoItem({ label, mono = false, value }: InfoItemProps) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <dt className="text-muted text-sm">{label}</dt>
      <dd
        className={`mt-2 break-all font-medium text-foreground ${
          mono ? "font-mono text-sm" : "text-base"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
