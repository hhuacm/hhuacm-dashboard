import { Alert } from "@hhuacm-dashboard/ui/components/alert";
import { Badge } from "@hhuacm-dashboard/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@hhuacm-dashboard/ui/components/card";
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

const badgeVariant = {
  danger: "destructive",
  default: "outline",
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
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardDescription>服务状态</CardDescription>
            <CardTitle className="mt-1">API 连接</CardTitle>
          </div>
          <Badge variant={badgeVariant[tone]}>{status}</Badge>
        </div>
      </CardHeader>

      <CardContent className="grid gap-4">
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
          <Alert variant={tone === "danger" ? "destructive" : "info"}>
            {message}
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}
