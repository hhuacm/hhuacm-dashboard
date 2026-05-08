import { cn } from "@hhuacm-dashboard/ui/lib/utils";
import type * as React from "react";

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: Consumers associate this shared label primitive with controls.
    <label
      className={cn(
        "flex select-none items-center gap-2 font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50 group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50",
        className
      )}
      data-slot="label"
      {...props}
    />
  );
}

export { Label };
