import { Alert, Card, Chip } from "@heroui/react";
import type { ReactNode } from "react";

import { InfoItem } from "./info-item";

type HealthTone = "danger" | "default" | "success" | "warning";

interface HealthDetail {
  label: string;
  mono?: boolean;
  value: ReactNode;
}

interface ServiceHealthPanelProps {
  details: HealthDetail[];
  message?: string;
  status: string;
  tone: HealthTone;
}

const chipColor = {
  danger: "danger",
  default: "default",
  success: "success",
  warning: "warning",
} as const;

export function ServiceHealthPanel({
  details,
  message,
  status,
  tone,
}: ServiceHealthPanelProps) {
  return (
    <Card>
      <Card.Header>
        <div className="flex items-start justify-between gap-4">
          <div>
            <Card.Description>服务状态</Card.Description>
            <Card.Title className="mt-1">API 连接</Card.Title>
          </div>
          <Chip color={chipColor[tone]} size="sm" variant="soft">
            {status}
          </Chip>
        </div>
      </Card.Header>

      <Card.Content className="grid gap-4">
        <dl className="grid gap-3 sm:grid-cols-2">
          {details.map((detail) => (
            <InfoItem
              key={detail.label}
              label={detail.label}
              mono={detail.mono}
              value={detail.value}
            />
          ))}
        </dl>

        {message ? (
          <Alert status={tone === "danger" ? "danger" : "default"}>
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>{message}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}
      </Card.Content>
    </Card>
  );
}
