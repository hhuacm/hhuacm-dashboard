import { cn } from "@hhuacm-dashboard/ui/lib/utils";
import type { ReactNode } from "react";

interface InfoItemProps {
  label: string;
  mono?: boolean;
  value: ReactNode;
}

export function InfoItem({ label, mono = false, value }: InfoItemProps) {
  return (
    <div className="rounded-md border bg-background p-4">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd
        className={cn(
          "mt-2 break-all font-medium text-foreground",
          mono ? "font-mono text-sm" : "text-base"
        )}
      >
        {value}
      </dd>
    </div>
  );
}
