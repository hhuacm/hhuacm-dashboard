import { cn } from "@hhuacm-dashboard/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-left text-sm",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        info: "border-primary/20 bg-primary/10 text-foreground",
        success:
          "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100",
        warning:
          "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100",
        destructive: "border-destructive/25 bg-destructive/10 text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      className={cn(alertVariants({ variant }), className)}
      data-slot="alert"
      role="alert"
      {...props}
    />
  );
}

export { Alert };
