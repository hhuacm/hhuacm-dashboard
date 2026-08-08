"use client";

import {
  Alert,
  Button,
  Chip,
  Form,
  ListBox,
  Modal,
  Select,
  Spinner,
} from "@heroui/react";
import {
  isMemberStatus,
  memberStatuses,
  memberStatusLabels,
  type OjPlatform,
  ojPlatformLabels,
  ojPlatforms,
} from "@hhuacm-dashboard/domain";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Save, Trash2 } from "lucide-react";
import { type FormEvent, type Key, useState } from "react";

import { DirtyFieldLabel } from "@/components/dirty-field-label";
import { OjAccountDeleteDialog } from "@/components/oj-account-delete-dialog";
import { OjAccountExternalIdField } from "@/components/oj-account-external-id-field";
import { ProfileFieldInput } from "@/components/profile-field-input";
import {
  type ProfileFieldKey,
  profileFieldConfigs,
} from "@/utils/profile-fields";
import { trpc } from "@/utils/trpc";
import {
  type AdminProfileFormValues,
  type AdminUserOjAccount,
  type AdminUserTableRow,
  buildAdminProfileFormValues,
  getAdminEditErrorMessage,
  getChangedAdminProfileValues,
  getOjAccountByPlatform,
  hasAdminProfileUpdateValues,
} from "../helpers";

interface AdminUserEditDialogProps {
  onClose: () => void;
  user: AdminUserTableRow | null;
}

interface AdminUserBasicInfoEditorProps {
  user: AdminUserTableRow;
}

interface AdminUserOjAccountEditorProps {
  accounts: AdminUserOjAccount[];
  userId: string;
}

interface AdminUserOjAccountRowProps {
  account: AdminUserOjAccount | undefined;
  platform: OjPlatform;
  userId: string;
}

interface EditorMessage {
  text: string;
  tone: "danger" | "success";
}

const adminUsersListQueryKey = trpc.admin.users.list.queryKey();

const getProfileSnapshotKey = (user: AdminUserTableRow) => {
  const { grade, major, memberStatus, realName, studentId } = user;

  return [user.id, memberStatus, grade, major, realName, studentId].join(":");
};

interface AdminProfileDraft {
  sourceKey: string;
  values: AdminProfileFormValues;
}

function AdminUserBasicInfoEditor({ user }: AdminUserBasicInfoEditorProps) {
  const queryClient = useQueryClient();
  const profileSnapshotKey = getProfileSnapshotKey(user);
  const originalFormValues = buildAdminProfileFormValues(user);
  const [draft, setDraft] = useState<AdminProfileDraft>({
    sourceKey: profileSnapshotKey,
    values: originalFormValues,
  });
  const [message, setMessage] = useState<EditorMessage | null>(null);
  const formValues =
    draft.sourceKey === profileSnapshotKey ? draft.values : originalFormValues;

  const changedValues = getChangedAdminProfileValues(
    formValues,
    originalFormValues
  );
  const hasChanges = hasAdminProfileUpdateValues(changedValues);
  const updateProfile = useMutation(
    trpc.admin.users.updateProfile.mutationOptions({
      onError: (error) => {
        setMessage({
          text: getAdminEditErrorMessage(error),
          tone: "danger",
        });
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: adminUsersListQueryKey,
        });
        setMessage({
          text: "基础信息已保存。",
          tone: "success",
        });
      },
    })
  );

  const handleInputChange = (field: ProfileFieldKey, value: string) => {
    setMessage(null);
    setDraft((currentDraft) => ({
      sourceKey: profileSnapshotKey,
      values: {
        ...(currentDraft.sourceKey === profileSnapshotKey
          ? currentDraft.values
          : originalFormValues),
        [field]: value,
      },
    }));
  };
  const handleStatusChange = (key: Key | null) => {
    if (!(typeof key === "string" && isMemberStatus(key))) {
      return;
    }

    setMessage(null);
    setDraft((currentDraft) => ({
      sourceKey: profileSnapshotKey,
      values: {
        ...(currentDraft.sourceKey === profileSnapshotKey
          ? currentDraft.values
          : originalFormValues),
        memberStatus: key,
      },
    }));
  };
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (!hasAdminProfileUpdateValues(changedValues)) {
      setMessage({
        text: "没有需要保存的修改。",
        tone: "success",
      });
      return;
    }

    await updateProfile.mutateAsync({
      userId: user.id,
      values: changedValues,
    });
  };

  return (
    <section className="grid gap-4 border-border border-b pb-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold text-base">基础信息</h3>
        </div>
      </div>

      {message ? (
        <Alert status={message.tone}>
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{message.text}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      <Form className="grid gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 px-0.5 pt-3 pb-0.5 sm:grid-cols-2">
          <Select
            fullWidth
            isDisabled={updateProfile.isPending}
            onSelectionChange={handleStatusChange}
            selectedKey={formValues.memberStatus}
            variant="secondary"
          >
            <DirtyFieldLabel
              isChanged={"memberStatus" in changedValues}
              label="状态"
            />
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {memberStatuses.map((status) => (
                  <ListBox.Item
                    id={status}
                    key={status}
                    textValue={memberStatusLabels[status]}
                  >
                    {memberStatusLabels[status]}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>

          {profileFieldConfigs.map((field) => (
            <ProfileFieldInput
              field={field}
              isChanged={field.key in changedValues}
              isDisabled={updateProfile.isPending}
              key={field.key}
              onChange={(nextValue) => handleInputChange(field.key, nextValue)}
              value={formValues[field.key]}
            />
          ))}
        </div>
        <div className="flex justify-end">
          <Button
            isDisabled={!hasChanges}
            isPending={updateProfile.isPending}
            type="submit"
          >
            {({ isPending }) => (
              <>
                {isPending ? (
                  <Spinner color="current" size="sm" />
                ) : (
                  <Save className="size-4" />
                )}
                {isPending ? "保存中" : "保存基础信息"}
              </>
            )}
          </Button>
        </div>
      </Form>
    </section>
  );
}

function AdminUserOjAccountRow({
  account,
  platform,
  userId,
}: AdminUserOjAccountRowProps) {
  const queryClient = useQueryClient();
  const [externalId, setExternalId] = useState(account?.externalId ?? "");
  const [message, setMessage] = useState<EditorMessage | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const invalidateUserData = async () =>
    await queryClient.invalidateQueries({
      queryKey: adminUsersListQueryKey,
    });
  const upsertAccount = useMutation(
    trpc.admin.users.upsertOjAccount.mutationOptions({
      onError: (error) => {
        setMessage({
          text: getAdminEditErrorMessage(error),
          tone: "danger",
        });
      },
      onSuccess: async () => {
        await invalidateUserData();
        setMessage({
          text: account ? "OJ 账号已更新。" : "OJ 账号已添加。",
          tone: "success",
        });
      },
    })
  );
  const deleteAccount = useMutation(
    trpc.admin.users.deleteOjAccount.mutationOptions({
      onError: (error) => {
        setMessage({
          text: getAdminEditErrorMessage(error),
          tone: "danger",
        });
      },
      onSuccess: async () => {
        await invalidateUserData();
        setIsDeleteDialogOpen(false);
        setMessage({
          text: "OJ 账号已删除。",
          tone: "success",
        });
      },
    })
  );
  const isChanged = externalId !== (account?.externalId ?? "");
  const canSave = Boolean(externalId) && isChanged;
  const isBusy = upsertAccount.isPending || deleteAccount.isPending;
  const platformLabel = ojPlatformLabels[platform];
  const saveIcon = account ? (
    <Save className="size-4" />
  ) : (
    <Plus className="size-4" />
  );
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (!canSave) {
      setMessage({
        text: externalId ? "没有需要保存的修改。" : "请填写账号标识。",
        tone: externalId ? "success" : "danger",
      });
      return;
    }

    await upsertAccount.mutateAsync({
      externalId,
      platform,
      userId,
    });
  };
  const handleDeleteConfirm = async () => {
    await deleteAccount.mutateAsync({
      platform,
      userId,
    });
  };

  return (
    <div className="grid gap-2 rounded-md border border-border p-3">
      <Form
        className="grid gap-3 md:grid-cols-[7rem_minmax(0,1fr)_auto]"
        onSubmit={handleSubmit}
      >
        <div className="flex min-h-10 items-center">
          <Chip
            color={account ? "success" : "default"}
            size="sm"
            variant="soft"
          >
            {platformLabel}
          </Chip>
        </div>
        <OjAccountExternalIdField
          isChanged={isChanged}
          isDisabled={isBusy}
          onChange={(nextValue) => {
            setMessage(null);
            setExternalId(nextValue);
          }}
          platform={platform}
          value={externalId}
        />
        {account && account.externalId !== account.handle ? (
          <p className="-mt-2 break-all text-muted text-xs md:col-start-2">
            当前展示名：
            <span className="font-mono">{account.handle}</span>
          </p>
        ) : null}
        <div className="flex items-end gap-2">
          <Button
            isDisabled={!canSave || deleteAccount.isPending}
            isPending={upsertAccount.isPending}
            type="submit"
            variant={account ? "secondary" : undefined}
          >
            {({ isPending }) => (
              <>
                {isPending ? <Spinner color="current" size="sm" /> : saveIcon}
                {account ? "保存" : "添加"}
              </>
            )}
          </Button>
          <Button
            isDisabled={!account || upsertAccount.isPending}
            onPress={() => {
              setMessage(null);
              setIsDeleteDialogOpen(true);
            }}
            variant="danger"
          >
            <Trash2 className="size-4" />
            删除
          </Button>
        </div>
      </Form>
      {message ? (
        <Alert status={message.tone}>
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{message.text}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}
      <OjAccountDeleteDialog
        errorMessage={
          isDeleteDialogOpen && message?.tone === "danger" ? message.text : null
        }
        isDeleting={deleteAccount.isPending}
        onCancel={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        target={isDeleteDialogOpen && account ? account : null}
      />
    </div>
  );
}

function AdminUserOjAccountEditor({
  accounts,
  userId,
}: AdminUserOjAccountEditorProps) {
  return (
    <section className="grid gap-4">
      <div>
        <h3 className="font-semibold text-base">OJ 账号</h3>
      </div>
      <div className="grid gap-3">
        {ojPlatforms.map((platform) => {
          const account = getOjAccountByPlatform(accounts, platform);

          return (
            <AdminUserOjAccountRow
              account={account}
              key={`${platform}:${account?.externalId ?? ""}`}
              platform={platform}
              userId={userId}
            />
          );
        })}
      </div>
    </section>
  );
}

export function AdminUserEditDialog({
  onClose,
  user,
}: AdminUserEditDialogProps) {
  const isOpen = Boolean(user);

  return (
    <Modal.Backdrop
      isOpen={isOpen}
      onOpenChange={(isNextOpen) => {
        if (!isNextOpen) {
          onClose();
        }
      }}
    >
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-190">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Icon className="bg-default">
              <Pencil className="size-5 text-accent" />
            </Modal.Icon>
            <Modal.Heading>编辑用户</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="grid max-h-[72vh] gap-5 overflow-y-auto px-0.5 pt-3 pb-0.5">
            {user ? (
              <>
                <div className="grid gap-2 rounded-md border border-border bg-surface p-3 text-sm sm:grid-cols-2">
                  <div>
                    <span className="text-muted">注册用户名</span>
                    <p className="mt-1 break-all font-mono">{user.username}</p>
                  </div>
                  <div>
                    <span className="text-muted">邮箱</span>
                    <p className="mt-1 break-all">{user.email}</p>
                  </div>
                </div>

                <AdminUserBasicInfoEditor user={user} />
                <AdminUserOjAccountEditor
                  accounts={user.ojAccounts}
                  userId={user.id}
                />
              </>
            ) : null}
          </Modal.Body>
          <Modal.Footer>
            <Button onPress={onClose} variant="secondary">
              关闭
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
