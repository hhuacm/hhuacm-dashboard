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
}

interface PasswordChangeMessage {
  text: string;
  tone: "danger" | "success";
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

const passwordFields = [
  {
    autoComplete: "current-password",
    label: "当前密码",
    name: "currentPassword",
    placeholder: "输入当前密码",
  },
  {
    autoComplete: "new-password",
    label: "新密码",
    name: "newPassword",
    placeholder: "至少 8 个字符",
  },
  {
    autoComplete: "new-password",
    label: "确认新密码",
    name: "confirmPassword",
    placeholder: "再次输入新密码",
  },
] as const satisfies readonly {
  autoComplete: "current-password" | "new-password";
  label: string;
  name: keyof PasswordChangeFormValues;
  placeholder: string;
}[];

const passwordChangeFormSchema = z
  .object({
    confirmPassword: z.string().min(1, "请再次输入新密码。"),
    currentPassword: z.string().min(1, "请输入当前密码。"),
    newPassword: z
      .string()
      .min(1, "请输入新密码。")
      .min(8, "新密码至少需要 8 个字符。"),
  })
  .refine((values) => values.confirmPassword === values.newPassword, {
    message: "两次输入的新密码不一致。",
    path: ["confirmPassword"],
  }) satisfies z.ZodType<PasswordChangeFormValues>;

const passwordChangeErrorMessages: Record<string, string> = {
  CREDENTIAL_ACCOUNT_NOT_FOUND: "当前账号没有可修改的密码。",
  FAILED_TO_GET_SESSION: "登录状态已失效，请重新登录。",
  INVALID_PASSWORD: "当前密码不正确。",
  PASSWORD_TOO_SHORT: "新密码至少需要 8 个字符。",
  SESSION_EXPIRED: "登录状态已失效，请重新登录。",
  SESSION_NOT_FRESH: "登录状态已失效，请重新登录。",
};

const getPasswordChangeErrorMessage = (code?: string) =>
  passwordChangeErrorMessages[code ?? ""] ?? "修改密码失败，请稍后再试。";

export function PasswordChangeDialog({
  isOpen,
  onClose,
}: PasswordChangeDialogProps) {
  const [message, setMessage] = useState<PasswordChangeMessage | null>(null);
  const form = useForm<PasswordChangeFormValues>({
    defaultValues: emptyPasswordChangeFormValues,
    resolver: zodResolver(passwordChangeFormSchema),
  });
  const {
    control,
    formState: { isSubmitting },
    handleSubmit: handleFormSubmit,
    reset,
  } = form;

  const closeDialog = () => {
    if (isSubmitting) {
      return;
    }

    reset();
    setMessage(null);
    onClose();
  };

  const handleSubmit = handleFormSubmit(
    async (values) => {
      setMessage(null);

      try {
        const response = await authClient.changePassword({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
          revokeOtherSessions: true,
        });

        if (response.error) {
          setMessage({
            text: getPasswordChangeErrorMessage(response.error.code),
            tone: "danger",
          });
          return;
        }

        reset();
        setMessage({
          text: "密码已更新，其他设备上的登录已退出。",
          tone: "success",
        });
      } catch {
        setMessage({
          text: "认证服务暂时不可用，请稍后再试。",
          tone: "danger",
        });
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

              {passwordFields.map((config) => (
                <Controller
                  control={control}
                  key={config.name}
                  name={config.name}
                  render={({ field }) => (
                    <PasswordField
                      autoComplete={config.autoComplete}
                      isDisabled={isSubmitting}
                      label={config.label}
                      name={field.name}
                      onChange={(value) => {
                        setMessage(null);
                        field.onChange(value);
                      }}
                      placeholder={config.placeholder}
                      value={field.value}
                    />
                  )}
                />
              ))}
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
