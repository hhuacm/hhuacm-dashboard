"use client";

import { Alert, Button, Form, Modal, Spinner } from "@heroui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Save } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { PasswordField } from "@/components/password-field";
import { authClient } from "@/utils/auth-client";

interface PasswordChangeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPasswordChanged: () => Promise<void>;
}

interface PasswordChangeMessage {
  text: string;
  tone: "danger" | "success";
}

interface AuthErrorLike {
  code?: string;
  message?: string;
}

interface PasswordChangeFormValues {
  confirmPassword: string;
  currentPassword: string;
  newPassword: string;
}

const emptyPasswordChangeFormValues: PasswordChangeFormValues = {
  confirmPassword: "",
  currentPassword: "",
  newPassword: "",
};

const passwordChangeFormSchema = z
  .object({
    confirmPassword: z.string(),
    currentPassword: z.string().min(1, "请输入当前密码。"),
    newPassword: z.string(),
  })
  .superRefine((values, context) => {
    if (!values.newPassword) {
      context.addIssue({
        code: "custom",
        message: "请输入新密码。",
        path: ["newPassword"],
      });
    } else if (values.newPassword.length < 8) {
      context.addIssue({
        code: "custom",
        message: "新密码至少需要 8 个字符。",
        path: ["newPassword"],
      });
    }

    if (!values.confirmPassword) {
      context.addIssue({
        code: "custom",
        message: "请再次输入新密码。",
        path: ["confirmPassword"],
      });
    } else if (
      values.newPassword &&
      values.confirmPassword !== values.newPassword
    ) {
      context.addIssue({
        code: "custom",
        message: "两次输入的新密码不一致。",
        path: ["confirmPassword"],
      });
    }
  }) satisfies z.ZodType<PasswordChangeFormValues>;

const getPasswordChangeErrorMessage = (
  error: AuthErrorLike | null | undefined
) => {
  const code = error?.code ?? "";
  const message = error?.message ?? "";

  if (code === "INVALID_PASSWORD" || message.includes("Invalid password")) {
    return "当前密码不正确。";
  }

  if (
    code === "PASSWORD_TOO_SHORT" ||
    message.includes("Password is too short") ||
    message.includes("too short")
  ) {
    return "新密码至少需要 8 个字符。";
  }

  if (code === "CREDENTIAL_ACCOUNT_NOT_FOUND") {
    return "当前账号没有可修改的密码。";
  }

  if (
    code === "FAILED_TO_GET_SESSION" ||
    code === "SESSION_EXPIRED" ||
    code === "SESSION_NOT_FRESH" ||
    message.includes("Session")
  ) {
    return "登录状态已失效，请重新登录。";
  }

  return "修改密码失败，请稍后再试。";
};

export function PasswordChangeDialog({
  isOpen,
  onClose,
  onPasswordChanged,
}: PasswordChangeDialogProps) {
  const [message, setMessage] = useState<PasswordChangeMessage | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<PasswordChangeFormValues>({
    defaultValues: emptyPasswordChangeFormValues,
    resolver: zodResolver(passwordChangeFormSchema),
  });
  const { control, handleSubmit: handleFormSubmit, reset } = form;

  const closeDialog = () => {
    if (isSubmitting) {
      return;
    }

    reset(emptyPasswordChangeFormValues);
    setMessage(null);
    onClose();
  };

  const handleInputChange = (
    value: string,
    onChange: (value: string) => void
  ) => {
    setMessage(null);
    onChange(value);
  };

  const handleSubmit = handleFormSubmit(
    async (values) => {
      setMessage(null);
      setIsSubmitting(true);

      try {
        const response = await authClient.changePassword({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        });

        if (response.error) {
          setMessage({
            text: getPasswordChangeErrorMessage(response.error),
            tone: "danger",
          });
          return;
        }
      } catch {
        setMessage({
          text: "认证服务暂时不可用，请稍后再试。",
          tone: "danger",
        });
        return;
      } finally {
        setIsSubmitting(false);
      }

      reset(emptyPasswordChangeFormValues);
      setMessage({
        text: "密码已更新，正在退出登录。",
        tone: "success",
      });
      setIsSubmitting(true);

      try {
        await onPasswordChanged();
      } catch {
        setMessage({
          text: "密码已更新，但自动退出登录失败，请手动退出后重新登录。",
          tone: "danger",
        });
        setIsSubmitting(false);
      }
    },
    (errors) => {
      setMessage({
        text:
          errors.currentPassword?.message ??
          errors.newPassword?.message ??
          errors.confirmPassword?.message ??
          "请检查密码信息。",
        tone: "danger",
      });
    }
  );

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={closeDialog}>
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-110">
          <Modal.CloseTrigger isDisabled={isSubmitting} />
          <Form className="contents" onSubmit={handleSubmit}>
            <Modal.Header>
              <Modal.Icon className="bg-default">
                <KeyRound className="size-5 text-accent" />
              </Modal.Icon>
              <Modal.Heading>修改密码</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="grid gap-4 px-0.5 pt-3 pb-0.5">
              {message ? (
                <Alert status={message.tone}>
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>{message.text}</Alert.Description>
                  </Alert.Content>
                </Alert>
              ) : null}

              <Controller
                control={control}
                name="currentPassword"
                render={({ field }) => (
                  <PasswordField
                    autoComplete="current-password"
                    isDisabled={isSubmitting}
                    label="当前密码"
                    name={field.name}
                    onChange={(value) =>
                      handleInputChange(value, field.onChange)
                    }
                    placeholder="输入当前密码"
                    value={field.value}
                  />
                )}
              />

              <Controller
                control={control}
                name="newPassword"
                render={({ field }) => (
                  <PasswordField
                    autoComplete="new-password"
                    isDisabled={isSubmitting}
                    label="新密码"
                    name={field.name}
                    onChange={(value) =>
                      handleInputChange(value, field.onChange)
                    }
                    placeholder="至少 8 个字符"
                    value={field.value}
                  />
                )}
              />

              <Controller
                control={control}
                name="confirmPassword"
                render={({ field }) => (
                  <PasswordField
                    autoComplete="new-password"
                    isDisabled={isSubmitting}
                    label="确认新密码"
                    name={field.name}
                    onChange={(value) =>
                      handleInputChange(value, field.onChange)
                    }
                    placeholder="再次输入新密码"
                    value={field.value}
                  />
                )}
              />
            </Modal.Body>
            <Modal.Footer>
              <Button
                isDisabled={isSubmitting}
                onPress={closeDialog}
                variant="secondary"
              >
                取消
              </Button>
              <Button isPending={isSubmitting} type="submit">
                {({ isPending }) => (
                  <>
                    {isPending ? (
                      <Spinner color="current" size="sm" />
                    ) : (
                      <Save className="size-4" />
                    )}
                    {isPending ? "处理中" : "保存"}
                  </>
                )}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
