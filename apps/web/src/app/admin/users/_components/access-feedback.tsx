import { Alert, Spinner } from "@heroui/react";

interface AccessFeedbackProps {
  isAccessError: boolean;
  isCheckingAccess: boolean;
  isMember: boolean;
  shouldPromptLogin: boolean;
}

export function AccessFeedback({
  isAccessError,
  isCheckingAccess,
  isMember,
  shouldPromptLogin,
}: AccessFeedbackProps) {
  return (
    <>
      {isCheckingAccess ? (
        <div className="flex items-center gap-3">
          <Spinner color="current" size="sm" />
          <p className="font-medium">正在确认管理员权限。</p>
        </div>
      ) : null}

      {shouldPromptLogin ? (
        <Alert status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>请登录管理员账户</Alert.Title>
            <Alert.Description>
              即将跳转到登录页面，登录后会回到用户列表。
            </Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {isMember ? (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>不具备管理员权限</Alert.Title>
            <Alert.Description>即将跳转到首页。</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {isAccessError ? (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>权限确认失败</Alert.Title>
            <Alert.Description>请刷新页面后重试。</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}
    </>
  );
}
