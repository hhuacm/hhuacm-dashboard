import { Alert, Spinner } from "@heroui/react";

import type { AdminAccessStatus } from "./use-admin-access";

interface AccessFeedbackProps {
  loginReturnLabel?: string;
  status: AdminAccessStatus;
}

export function AccessFeedback({
  loginReturnLabel = "管理面板",
  status,
}: AccessFeedbackProps) {
  if (status === "checking") {
    return (
      <div className="flex items-center gap-3">
        <Spinner color="current" size="sm" />
        <p className="font-medium">正在确认管理员权限。</p>
      </div>
    );
  }

  if (status === "guest") {
    return (
      <Alert status="warning">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>请登录管理员账户</Alert.Title>
          <Alert.Description>
            即将跳转到登录页面，登录后会回到{loginReturnLabel}。
          </Alert.Description>
        </Alert.Content>
      </Alert>
    );
  }

  if (status === "member") {
    return (
      <Alert status="danger">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>不具备管理员权限</Alert.Title>
          <Alert.Description>即将跳转到首页。</Alert.Description>
        </Alert.Content>
      </Alert>
    );
  }

  if (status === "error") {
    return (
      <Alert status="danger">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>权限确认失败</Alert.Title>
          <Alert.Description>请刷新页面后重试。</Alert.Description>
        </Alert.Content>
      </Alert>
    );
  }

  return null;
}
