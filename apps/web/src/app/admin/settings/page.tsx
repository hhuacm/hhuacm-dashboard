"use client";

import {
  Alert,
  Button,
  Card,
  Form,
  Spinner,
  TextArea,
  TextField,
} from "@heroui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Settings } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { DirtyFieldLabel } from "@/components/dirty-field-label";
import { trpc } from "@/utils/trpc";
import { AccessFeedback } from "../_shared/access-feedback";
import { useAdminAccess } from "../_shared/use-admin-access";

interface SettingsMessage {
  text: string;
  tone: "danger" | "success";
}

interface SettingsFieldProps {
  children: ReactNode;
  description: string;
  isChanged: boolean;
  title: string;
}

const getSettingsSaveErrorMessage = () => "保存失败，请稍后再试。";

function SettingsField({
  children,
  description,
  isChanged,
  title,
}: SettingsFieldProps) {
  return (
    <div className="grid gap-3">
      <div className="grid gap-1">
        <DirtyFieldLabel isChanged={isChanged} label={title} />
        <p className="text-muted text-sm leading-6">{description}</p>
      </div>
      {children}
    </div>
  );
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { accountMe, isAdmin, isCheckingAccess, isMember, shouldPromptLogin } =
    useAdminAccess();
  const [formMarkdown, setFormMarkdown] = useState("");
  const [originalMarkdown, setOriginalMarkdown] = useState("");
  const [message, setMessage] = useState<SettingsMessage | null>(null);
  const homeNotice = useQuery(
    trpc.dashboard.homeNotice.queryOptions(undefined, {
      enabled: isAdmin,
      retry: false,
    })
  );
  const updateHomeNotice = useMutation(
    trpc.admin.siteSettings.updateHomeNotice.mutationOptions()
  );
  const hasChanges = formMarkdown !== originalMarkdown;

  useEffect(() => {
    if (!homeNotice.data) {
      return;
    }

    setFormMarkdown(homeNotice.data.markdown);
    setOriginalMarkdown(homeNotice.data.markdown);
  }, [homeNotice.data]);

  const handleMarkdownChange = (nextMarkdown: string) => {
    setMessage(null);
    setFormMarkdown(nextMarkdown);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (!hasChanges) {
      setMessage({
        text: "没有需要保存的修改。",
        tone: "success",
      });
      return;
    }

    try {
      const result = await updateHomeNotice.mutateAsync({
        markdown: formMarkdown,
      });
      setFormMarkdown(result.markdown);
      setOriginalMarkdown(result.markdown);
      await queryClient.invalidateQueries({
        queryKey: trpc.dashboard.homeNotice.queryKey(),
      });
      setMessage({
        text: "全局设置已保存。",
        tone: "success",
      });
    } catch {
      setMessage({
        text: getSettingsSaveErrorMessage(),
        tone: "danger",
      });
    }
  };

  const shellAction = (
    <Button
      onPress={() => router.push("/admin" as Route)}
      size="sm"
      variant="outline"
    >
      <ArrowLeft className="size-4" />
      返回管理面板
    </Button>
  );

  return (
    <AppShell
      action={shellAction}
      description="管理员控制台"
      icon={<Settings className="size-4" />}
      maxWidth="5xl"
      title="全局设置"
    >
      <div className="grid gap-4">
        <AccessFeedback
          isAccessError={accountMe.isError}
          isCheckingAccess={isCheckingAccess}
          isMember={isMember}
          loginReturnLabel="全局设置"
          shouldPromptLogin={shouldPromptLogin}
        />

        {isAdmin ? (
          <Card>
            <Card.Header>
              <div>
                <Card.Title className="text-xl">站点全局配置</Card.Title>
              </div>
            </Card.Header>
            <Card.Content className="grid gap-4">
              {homeNotice.isPending ? (
                <Alert>
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>正在读取全局设置。</Alert.Description>
                  </Alert.Content>
                </Alert>
              ) : null}

              {homeNotice.isError ? (
                <Alert status="danger">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>
                      全局设置加载失败，请刷新页面重试。
                    </Alert.Description>
                  </Alert.Content>
                </Alert>
              ) : null}

              {message ? (
                <Alert status={message.tone}>
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>{message.text}</Alert.Description>
                  </Alert.Content>
                </Alert>
              ) : null}

              <Form className="grid gap-4" onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  isDisabled={
                    homeNotice.isPending || updateHomeNotice.isPending
                  }
                  name="homeNoticeMarkdown"
                  onChange={handleMarkdownChange}
                  value={formMarkdown}
                >
                  <SettingsField
                    description="展示在首页左侧“队伍公告”区域，支持常见 Markdown 语法。"
                    isChanged={hasChanges}
                    title="首页公告 Markdown"
                  >
                    <TextArea
                      placeholder="填写首页公告内容"
                      rows={8}
                      style={{ resize: "vertical" }}
                      variant="secondary"
                    />
                  </SettingsField>
                </TextField>

                <div className="flex justify-end">
                  <Button
                    isDisabled={homeNotice.isPending || !hasChanges}
                    isPending={updateHomeNotice.isPending}
                    type="submit"
                  >
                    {({ isPending }) => (
                      <>
                        {isPending ? (
                          <Spinner color="current" size="sm" />
                        ) : (
                          <Save className="size-4" />
                        )}
                        {isPending ? "保存中" : "保存全局设置"}
                      </>
                    )}
                  </Button>
                </div>
              </Form>
            </Card.Content>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
