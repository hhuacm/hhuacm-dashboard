"use client";

import {
  Alert,
  Button,
  Card,
  Chip,
  Form,
  Input,
  Label,
  Spinner,
  TextArea,
  TextField,
} from "@heroui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ListChecks, Save } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { authClient } from "@/utils/auth-client";
import { trpc } from "@/utils/trpc";
import { AccessFeedback } from "../../users/_components/access-feedback";
import { redirectDelayMs } from "../../users/helpers";
import { parseProblemPidText } from "./_model/problem-pid-import";

const previewPidLimit = 80;

interface ImportMessage {
  text: string;
  title: string;
}

interface ProblemPidPreviewProps {
  duplicatePids: string[];
  invalidPids: string[];
  pids: string[];
}

const getProblemSetImportErrorMessage = () => "导入失败，请检查内容后重试。";

function ProblemPidPreview({
  duplicatePids,
  invalidPids,
  pids,
}: ProblemPidPreviewProps) {
  const visiblePids = pids.slice(0, previewPidLimit);
  const hiddenPidCount = Math.max(0, pids.length - visiblePids.length);
  const hasProblemPids = pids.length > 0;
  const hasParseErrors = invalidPids.length > 0 || duplicatePids.length > 0;

  return (
    <div className="grid gap-3 rounded-lg border bg-surface-secondary p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium">解析预览</p>
          <p className="text-muted text-sm">
            {hasProblemPids ? `共 ${pids.length} 道题` : "尚未解析到题号"}
          </p>
        </div>
        {hasParseErrors ? (
          <Chip color="danger" size="sm" variant="soft">
            需要修正
          </Chip>
        ) : (
          <Chip
            color={hasProblemPids ? "accent" : "default"}
            size="sm"
            variant="soft"
          >
            {hasProblemPids ? "可导入" : "等待输入"}
          </Chip>
        )}
      </div>

      {invalidPids.length > 0 ? (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>存在非法题号</Alert.Title>
            <Alert.Description>{invalidPids.join("、")}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {duplicatePids.length > 0 ? (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>存在重复题号</Alert.Title>
            <Alert.Description>{duplicatePids.join("、")}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {hasProblemPids ? (
        <div className="flex max-h-48 flex-wrap gap-2 overflow-auto">
          {visiblePids.map((pid, index) => (
            <Chip
              className="font-mono"
              key={`${pid}-${index}`}
              size="sm"
              variant="soft"
            >
              {pid}
            </Chip>
          ))}
          {hiddenPidCount > 0 ? (
            <Chip size="sm" variant="soft">
              还有 {hiddenPidCount} 个
            </Chip>
          ) : null}
        </div>
      ) : (
        <p className="text-muted text-sm leading-6">
          支持英文逗号、中文逗号、换行和空格分隔。
        </p>
      )}
    </div>
  );
}

export default function AdminProblemSetImportPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = authClient.useSession();
  const user = session.data?.user ?? null;
  const [title, setTitle] = useState("");
  const [descriptionMarkdown, setDescriptionMarkdown] = useState("");
  const [pidText, setPidText] = useState("");
  const [message, setMessage] = useState<ImportMessage | null>(null);
  const accountMe = useQuery(
    trpc.account.me.queryOptions(undefined, {
      enabled: Boolean(user),
      retry: false,
    })
  );
  const isAdmin = accountMe.data?.role === "admin";
  const isMember = Boolean(accountMe.data && !isAdmin);
  const isCheckingAccess =
    session.isPending || (Boolean(user) && accountMe.isPending);
  const shouldPromptLogin = !(session.isPending || user);
  const parsedPids = useMemo(() => parseProblemPidText(pidText), [pidText]);
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

  useEffect(() => {
    if (session.isPending) {
      return;
    }

    if (!user) {
      const timeoutId = window.setTimeout(() => {
        router.push("/login?redirect=/admin/problem-sets/import");
      }, redirectDelayMs);

      return () => window.clearTimeout(timeoutId);
    }

    if (isMember) {
      const timeoutId = window.setTimeout(() => {
        router.push("/");
      }, redirectDelayMs);

      return () => window.clearTimeout(timeoutId);
    }
  }, [isMember, router, session.isPending, user]);

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
        <AccessFeedback
          isAccessError={accountMe.isError}
          isCheckingAccess={isCheckingAccess}
          isMember={isMember}
          loginReturnLabel="导入题单"
          shouldPromptLogin={shouldPromptLogin}
        />

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
                    placeholder="可不填"
                    rows={5}
                    style={{ resize: "vertical" }}
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
                    placeholder="P1001, P1002, P1003"
                    rows={8}
                    style={{ resize: "vertical" }}
                    variant="secondary"
                  />
                </TextField>

                <ProblemPidPreview
                  duplicatePids={parsedPids.duplicatePids}
                  invalidPids={parsedPids.invalidPids}
                  pids={parsedPids.pids}
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
