"use client";

import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Label,
  Spinner,
  TextArea,
  TextField,
} from "@heroui/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ListChecks, Save } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { trpc } from "@/utils/trpc";
import { AccessFeedback } from "../../_shared/access-feedback";
import { useAdminAccess } from "../../_shared/use-admin-access";
import { ProblemPidPreview } from "../_components/problem-pid-preview";
import { parseProblemPidText } from "../_model/problem-pid-text";

interface ImportMessage {
  text: string;
  title: string;
}

const getProblemSetImportErrorMessage = () => "导入失败，请检查内容后重试。";

export default function AdminProblemSetImportPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAdmin, status } = useAdminAccess();
  const [title, setTitle] = useState("");
  const [descriptionMarkdown, setDescriptionMarkdown] = useState("");
  const [pidText, setPidText] = useState("");
  const [message, setMessage] = useState<ImportMessage | null>(null);
  const parsedPids = parseProblemPidText(pidText);
  const createProblemSet = useMutation(
    trpc.admin.problemSets.create.mutationOptions()
  );
  const trimmedTitle = title.trim();
  const hasProblemPids = parsedPids.pids.length > 0;
  const hasParseErrors =
    parsedPids.invalidPids.length > 0 || parsedPids.duplicatePids.length > 0;
  const isFormDisabled = createProblemSet.isPending;
  const canSubmit =
    Boolean(trimmedTitle) &&
    hasProblemPids &&
    !hasParseErrors &&
    !createProblemSet.isPending;

  const clearMessage = () => setMessage(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (!trimmedTitle) {
      setMessage({
        text: "请填写题单标题。",
        title: "无法导入",
      });
      return;
    }

    if (!hasProblemPids) {
      setMessage({
        text: "请至少填写一个题号。",
        title: "无法导入",
      });
      return;
    }

    if (parsedPids.invalidPids.length > 0) {
      setMessage({
        text: "请先修正非法题号。",
        title: "无法导入",
      });
      return;
    }

    if (parsedPids.duplicatePids.length > 0) {
      setMessage({
        text: "请先移除重复题号。",
        title: "无法导入",
      });
      return;
    }

    try {
      const createdProblemSet = await createProblemSet.mutateAsync({
        descriptionMarkdown,
        pids: parsedPids.pids,
        title: trimmedTitle,
      });

      await queryClient.invalidateQueries({
        queryKey: trpc.problemSet.list.queryKey(),
      });
      router.push(`/problem-sets/${createdProblemSet.id}` as Route);
    } catch {
      setMessage({
        text: getProblemSetImportErrorMessage(),
        title: "导入失败",
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
      icon={<ListChecks className="size-4" />}
      maxWidth="5xl"
      title="导入题单"
    >
      <div className="grid gap-6">
        <AccessFeedback loginReturnLabel="导入题单" status={status} />

        {isAdmin ? (
          <Card>
            <Card.Header>
              <div>
                <Card.Title className="text-xl">新建洛谷题单</Card.Title>
                <Card.Description>
                  粘贴题号文本后会先在本页解析并检查格式。
                </Card.Description>
              </div>
            </Card.Header>
            <Card.Content className="grid gap-4">
              {message ? (
                <Alert status="danger">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>{message.title}</Alert.Title>
                    <Alert.Description>{message.text}</Alert.Description>
                  </Alert.Content>
                </Alert>
              ) : null}

              <Form className="grid gap-4" onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  isDisabled={isFormDisabled}
                  name="title"
                  onChange={(nextTitle) => {
                    clearMessage();
                    setTitle(nextTitle);
                  }}
                  value={title}
                >
                  <Label>题单标题</Label>
                  <Input
                    autoComplete="off"
                    placeholder="例如：基础语法训练"
                    variant="secondary"
                  />
                </TextField>

                <TextField
                  fullWidth
                  isDisabled={isFormDisabled}
                  name="descriptionMarkdown"
                  onChange={(nextMarkdown) => {
                    clearMessage();
                    setDescriptionMarkdown(nextMarkdown);
                  }}
                  value={descriptionMarkdown}
                >
                  <div className="grid gap-1">
                    <Label>题单说明 Markdown</Label>
                    <p className="text-muted text-sm leading-6">
                      可填写训练目标、建议顺序或补充说明。
                    </p>
                  </div>
                  <TextArea
                    className="resize-y"
                    placeholder="可不填"
                    rows={5}
                    variant="secondary"
                  />
                </TextField>

                <TextField
                  fullWidth
                  isDisabled={isFormDisabled}
                  name="pidText"
                  onChange={(nextPidText) => {
                    clearMessage();
                    setPidText(nextPidText);
                  }}
                  value={pidText}
                >
                  <div className="grid gap-1">
                    <Label>题号列表</Label>
                    <p className="text-muted text-sm leading-6">
                      支持逗号、换行或空格分隔，例如 P1001, P1002, P1003。
                    </p>
                  </div>
                  <TextArea
                    className="resize-y"
                    placeholder="P1001, P1002, P1003"
                    rows={8}
                    variant="secondary"
                  />
                </TextField>

                <ProblemPidPreview
                  duplicatePids={parsedPids.duplicatePids}
                  invalidPids={parsedPids.invalidPids}
                  pids={parsedPids.pids}
                  readyLabel="可导入"
                />

                <div className="flex justify-end">
                  <Button
                    isDisabled={!canSubmit}
                    isPending={createProblemSet.isPending}
                    type="submit"
                  >
                    {({ isPending }) => (
                      <>
                        {isPending ? (
                          <Spinner color="current" size="sm" />
                        ) : (
                          <Save className="size-4" />
                        )}
                        {isPending ? "导入中" : "导入题单"}
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
