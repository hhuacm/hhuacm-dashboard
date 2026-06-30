"use client";

import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Spinner,
  TextArea,
  TextField,
} from "@heroui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ListChecks, Save } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { type FormEvent, use, useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { DirtyFieldLabel } from "@/components/dirty-field-label";
import { trpc } from "@/utils/trpc";
import { AccessFeedback } from "../../../_shared/access-feedback";
import { useAdminAccess } from "../../../_shared/use-admin-access";
import { ProblemPidPreview } from "../../_components/problem-pid-preview";
import { parseProblemPidText } from "../../_model/problem-pid-text";

interface AdminProblemSetEditPageProps {
  params: Promise<{
    id: string;
  }>;
}

interface EditMessage {
  text: string;
  title: string;
  tone: "danger" | "success";
}

interface ProblemSetEditOriginalValues {
  descriptionMarkdown: string;
  pids: string[];
  title: string;
}

interface ProblemSetEditChangedFields {
  descriptionMarkdown: boolean;
  pids: boolean;
  title: boolean;
}

const getProblemSetEditErrorMessage = () => "保存失败，请检查内容后重试。";

const areOrderedPidsEqual = (left: string[], right: string[]) =>
  left.length === right.length &&
  left.every((pid, index) => pid === right[index]);

const unchangedProblemSetEditFields: ProblemSetEditChangedFields = {
  descriptionMarkdown: false,
  pids: false,
  title: false,
};

const getChangedProblemSetEditFields = (
  currentValues: ProblemSetEditOriginalValues,
  originalValues: ProblemSetEditOriginalValues | null
): ProblemSetEditChangedFields => {
  if (!originalValues) {
    return unchangedProblemSetEditFields;
  }

  return {
    descriptionMarkdown:
      currentValues.descriptionMarkdown !== originalValues.descriptionMarkdown,
    pids: !areOrderedPidsEqual(currentValues.pids, originalValues.pids),
    title: currentValues.title !== originalValues.title,
  };
};

const hasProblemSetEditChanges = (changedFields: ProblemSetEditChangedFields) =>
  changedFields.title ||
  changedFields.descriptionMarkdown ||
  changedFields.pids;

export default function AdminProblemSetEditPage({
  params,
}: AdminProblemSetEditPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = use(params);
  const { accountMe, isAdmin, isCheckingAccess, isMember, shouldPromptLogin } =
    useAdminAccess();
  const [title, setTitle] = useState("");
  const [descriptionMarkdown, setDescriptionMarkdown] = useState("");
  const [pidText, setPidText] = useState("");
  const [initializedProblemSetId, setInitializedProblemSetId] = useState<
    null | string
  >(null);
  const [originalValues, setOriginalValues] =
    useState<ProblemSetEditOriginalValues | null>(null);
  const [message, setMessage] = useState<EditMessage | null>(null);
  const problemSetQuery = useQuery(
    trpc.problemSet.get.queryOptions(
      { id },
      {
        enabled: Boolean(isAdmin),
      }
    )
  );
  const problemSet = problemSetQuery.data ?? null;
  const parsedPids = useMemo(() => parseProblemPidText(pidText), [pidText]);
  const updateProblemSet = useMutation(
    trpc.admin.problemSets.update.mutationOptions()
  );
  const trimmedTitle = title.trim();
  const hasProblemPids = parsedPids.pids.length > 0;
  const hasParseErrors =
    parsedPids.invalidPids.length > 0 || parsedPids.duplicatePids.length > 0;
  const changedFields = getChangedProblemSetEditFields(
    {
      descriptionMarkdown,
      pids: parsedPids.pids,
      title: trimmedTitle,
    },
    originalValues
  );
  const hasChanges = hasProblemSetEditChanges(changedFields);
  const isFormDisabled =
    updateProblemSet.isPending || problemSetQuery.isPending;
  const canSubmit =
    Boolean(trimmedTitle) &&
    hasProblemPids &&
    !hasParseErrors &&
    hasChanges &&
    !updateProblemSet.isPending &&
    Boolean(problemSet);

  useEffect(() => {
    if (!(problemSet && initializedProblemSetId !== problemSet.id)) {
      return;
    }

    const nextPids = problemSet.problems.map((problem) => problem.pid);

    setTitle(problemSet.title);
    setDescriptionMarkdown(problemSet.descriptionMarkdown);
    setPidText(nextPids.join("\n"));
    setOriginalValues({
      descriptionMarkdown: problemSet.descriptionMarkdown,
      pids: nextPids,
      title: problemSet.title,
    });
    setInitializedProblemSetId(problemSet.id);
    setMessage(null);
  }, [initializedProblemSetId, problemSet]);

  const clearMessage = () => setMessage(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (!problemSet) {
      setMessage({
        text: "题单尚未加载完成。",
        tone: "danger",
        title: "无法保存",
      });
      return;
    }

    if (!trimmedTitle) {
      setMessage({
        text: "请填写题单标题。",
        tone: "danger",
        title: "无法保存",
      });
      return;
    }

    if (!hasProblemPids) {
      setMessage({
        text: "请至少填写一个题号。",
        tone: "danger",
        title: "无法保存",
      });
      return;
    }

    if (parsedPids.invalidPids.length > 0) {
      setMessage({
        text: "请先修正非法题号。",
        tone: "danger",
        title: "无法保存",
      });
      return;
    }

    if (parsedPids.duplicatePids.length > 0) {
      setMessage({
        text: "请先移除重复题号。",
        tone: "danger",
        title: "无法保存",
      });
      return;
    }

    if (!hasChanges) {
      setMessage({
        text: "没有需要保存的修改。",
        tone: "success",
        title: "无需保存",
      });
      return;
    }

    try {
      await updateProblemSet.mutateAsync({
        descriptionMarkdown,
        id: problemSet.id,
        pids: parsedPids.pids,
        title: trimmedTitle,
      });

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: trpc.problemSet.list.queryKey(),
        }),
        queryClient.invalidateQueries({
          queryKey: trpc.problemSet.get.queryKey({ id: problemSet.id }),
        }),
        queryClient.invalidateQueries({
          queryKey: trpc.problemSet.completions.queryKey({
            id: problemSet.id,
          }),
        }),
      ]);
      router.push(`/problem-sets/${problemSet.id}` as Route);
    } catch {
      setMessage({
        text: getProblemSetEditErrorMessage(),
        tone: "danger",
        title: "保存失败",
      });
    }
  };

  const shellAction = (
    <Button
      onPress={() => router.push(`/problem-sets/${id}` as Route)}
      size="sm"
      variant="outline"
    >
      <ArrowLeft className="size-4" />
      返回题单
    </Button>
  );

  return (
    <AppShell
      action={shellAction}
      description="管理员控制台"
      icon={<ListChecks className="size-4" />}
      maxWidth="5xl"
      title="编辑题单"
    >
      <div className="grid gap-6">
        <AccessFeedback
          isAccessError={accountMe.isError}
          isCheckingAccess={isCheckingAccess}
          isMember={isMember}
          loginReturnLabel="编辑题单"
          shouldPromptLogin={shouldPromptLogin}
        />

        {isAdmin && problemSetQuery.isPending ? (
          <div className="flex items-center gap-3">
            <Spinner color="current" size="sm" />
            <p className="font-medium">正在加载题单。</p>
          </div>
        ) : null}

        {isAdmin && problemSetQuery.isError ? (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>题单加载失败</Alert.Title>
              <Alert.Description>请返回题单详情后重试。</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        {isAdmin && problemSet ? (
          <Card>
            <Card.Header>
              <div>
                <Card.Title className="text-xl">修改题单</Card.Title>
              </div>
            </Card.Header>
            <Card.Content className="grid gap-4">
              {message ? (
                <Alert status={message.tone}>
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>{message.title}</Alert.Title>
                    <Alert.Description>{message.text}</Alert.Description>
                  </Alert.Content>
                </Alert>
              ) : null}

              <Form className="grid gap-4" onSubmit={handleSubmit}>
                <TextField
                  className="gap-3"
                  fullWidth
                  isDisabled={isFormDisabled}
                  name="title"
                  onChange={(nextTitle) => {
                    clearMessage();
                    setTitle(nextTitle);
                  }}
                  value={title}
                >
                  <DirtyFieldLabel
                    isChanged={changedFields.title}
                    label="题单标题"
                  />
                  <Input
                    autoComplete="off"
                    placeholder="例如：基础语法训练"
                    variant="secondary"
                  />
                </TextField>

                <TextField
                  className="gap-3"
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
                    <DirtyFieldLabel
                      isChanged={changedFields.descriptionMarkdown}
                      label="题单说明 Markdown"
                    />
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
                  className="gap-3"
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
                    <DirtyFieldLabel
                      isChanged={changedFields.pids}
                      label="题号列表"
                    />
                    <p className="text-muted text-sm leading-6">
                      支持逗号、换行或空格分隔，保存时会按当前顺序更新题单。
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
                  readyLabel="可保存"
                />

                <div className="flex justify-end">
                  <Button
                    isDisabled={!canSubmit}
                    isPending={updateProblemSet.isPending}
                    type="submit"
                  >
                    {({ isPending }) => (
                      <>
                        {isPending ? (
                          <Spinner color="current" size="sm" />
                        ) : (
                          <Save className="size-4" />
                        )}
                        {isPending ? "保存中" : "保存修改"}
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
