import { Chip, Label } from "@heroui/react";
import clsx from "clsx";

interface DirtyFieldLabelProps {
  isChanged?: boolean;
  label: string;
}

export function DirtyFieldLabel({
  isChanged = false,
  label,
}: DirtyFieldLabelProps) {
  return (
    <Label
      className={clsx(
        isChanged
          ? "inline-flex items-center gap-2 font-semibold text-accent"
          : "font-medium text-foreground"
      )}
    >
      {label}
      {isChanged ? (
        <Chip color="accent" size="sm" variant="soft">
          已修改
        </Chip>
      ) : null}
    </Label>
  );
}
