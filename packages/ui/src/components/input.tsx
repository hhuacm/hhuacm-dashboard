import { Input as InputPrimitive } from "@base-ui/react/input";
import { cn } from "@hhuacm-dashboard/ui/lib/utils";
import type * as React from "react";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      className={cn(
        "h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors file:inline-flex file:h-7 file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20",
        className
      )}
      data-slot="input"
      type={type}
      {...props}
    />
  );
}

export { Input };
