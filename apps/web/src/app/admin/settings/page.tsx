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
import { type FormEvent, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { DirtyFieldLabel } from "@/components/dirty-field-label";
import { trpc } from "@/utils/trpc";

interface SettingsMessage {
  text: string;
  tone: "danger" | "success";
}

function HomeNoticeSettingsEditor({
  initialMarkdown,
}: {
  initialMarkdown: string;
}) {
  const queryClient = useQueryClient();
  const [formMarkdown, setFormMarkdown] = useState(initialMarkdown);
  const [originalMarkdown, setOriginalMarkdown] = useState(initialMarkdown);
  const [message, setMessage] = useState<SettingsMessage | null>(null);
  const updateHomeNotice = useMutation(
    trpc.admin.siteSettings.updateHomeNotice.mutationOptions()
  );
  const hasChanges = formMarkdown !== originalMarkdown;

  const handleMarkdownChange = (nextMarkdown: string) => {
    setMessage(null);
    setFormMarkdown(nextMarkdown);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

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
        text: "保存失败，请稍后再试。",
        tone: "danger",
      });
    }
  };

  return (
    <>
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
          isDisabled={updateHomeNotice.isPending}
          name="homeNoticeMarkdown"
          onChange={handleMarkdownChange}
          value={formMarkdown}
        >
          <div className="grid gap-3">
            <div className="grid gap-1">
              <DirtyFieldLabel
                isChanged={hasChanges}
                label="首页公告 Markdown"
              />
              <p className="text-muted text-sm leading-6">
                展示在首页左侧“队伍公告”区域，支持常见 Markdown 语法。
              </p>
            </div>
            <TextArea
              className="resize-y"
              placeholder="填写首页公告内容"
              rows={8}
              variant="secondary"
            />
          </div>
        </TextField>

        <div className="flex justify-end">
          <Button
            isDisabled={!hasChanges}
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
    </>
  );
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const homeNotice = useQuery(
    trpc.dashboard.homeNotice.queryOptions(undefined, {
      retry: false,
    })
  );
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

            {homeNotice.data ? (
              <HomeNoticeSettingsEditor
                initialMarkdown={homeNotice.data.markdown}
              />
            ) : null}
          </Card.Content>
        </Card>
      </div>
    </AppShell>
  );
}
