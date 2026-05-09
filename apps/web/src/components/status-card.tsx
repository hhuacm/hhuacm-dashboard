import { Card } from "@heroui/react";
import type { ReactNode } from "react";

const toneClassNames = {
  danger: "bg-danger-soft text-danger",
  info: "bg-accent-soft text-accent",
  neutral: "bg-default text-muted",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
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
    <Card>
      <Card.Header className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Card.Description>{title}</Card.Description>
            <Card.Title className="mt-1 text-xl">{value}</Card.Title>
          </div>
          {icon ? (
            <div
              className={`grid size-9 shrink-0 place-items-center rounded-md ${toneClassNames[tone]}`}
            >
              {icon}
            </div>
          ) : null}
        </div>
      </Card.Header>
      <Card.Content>
        <p className="text-muted text-sm leading-6">{description}</p>
      </Card.Content>
    </Card>
  );
}
