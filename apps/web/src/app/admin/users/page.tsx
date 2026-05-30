"use client";

import { Button, Spinner } from "@heroui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, UsersRound } from "lucide-react";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { useColumnVisibility } from "@/components/column-visibility";
import { authClient } from "@/utils/auth-client";
import { trpc } from "@/utils/trpc";
import { AccessFeedback } from "./_components/access-feedback";
import { AdminUserDeleteDialog } from "./_components/admin-user-delete-dialog";
import { AdminUserEditDialog } from "./_components/admin-user-edit-dialog";
import { AdminUsersTableSection } from "./_components/admin-users-table-section";
import {
  adminUsersColumns,
  adminUsersColumnVisibilityStorageKey,
} from "./_model/admin-users-table-columns";
import {
  type AdminUsersFilters,
  type AdminUsersSort,
  type AdminUserTableRow,
  emptyAdminUsersFilters,
  getAdminEditErrorMessage,
  hasFilters,
  isMemberStatusFilterValue,
  isOjPlatformFilterValue,
  redirectDelayMs,
} from "./helpers";

function AdminUsersPageFallback() {
  return (
    <AppShell
      description="管理员控制台"
      icon={<UsersRound className="size-4" />}
      title="用户列表"
    >
      <div className="flex items-center gap-2 text-muted text-sm">
        <Spinner color="current" size="sm" />
        加载用户列表
      </div>
    </AppShell>
  );
}

function AdminUsersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const session = authClient.useSession();
  const user = session.data?.user ?? null;
  const targetUsername = searchParams.get("username");
  const [filters, setFilters] = useState<AdminUsersFilters>(
    emptyAdminUsersFilters
  );
  const [sort, setSort] = useState<AdminUsersSort>({
    column: "username",
    direction: "ascending",
  });
  const [editTargetUser, setEditTargetUser] =
    useState<AdminUserTableRow | null>(null);
  const [deleteTargetUser, setDeleteTargetUser] =
    useState<AdminUserTableRow | null>(null);
  const [deleteConfirmationValue, setDeleteConfirmationValue] = useState("");
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(
    null
  );
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

  useEffect(() => {
    if (session.isPending) {
      return;
    }

    if (!user) {
      const timeoutId = window.setTimeout(() => {
        router.push("/login?redirect=/admin/users");
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

  const handleFilterChange = (
    key: keyof AdminUsersFilters,
    values: string[]
  ) => {
    const nextValues = (() => {
      if (key === "memberStatuses") {
        return values.filter(isMemberStatusFilterValue);
      }

      if (key === "ojPlatforms") {
        return values.filter(isOjPlatformFilterValue);
      }

      return values;
    })();

    setFilters((currentFilters) => ({
      ...currentFilters,
      [key]: nextValues,
    }));
  };

  const handleClearFilters = () => {
    setFilters(emptyAdminUsersFilters);
  };

  const handleSortChange = useCallback((nextSort: AdminUsersSort) => {
    setSort(nextSort);
  }, []);

  const handleEditUser = (nextUser: AdminUserTableRow) => {
    setEditTargetUser(nextUser);
  };

  const closeEditDialog = () => {
    setEditTargetUser(null);
  };

  const handleDeleteUser = (nextUser: AdminUserTableRow) => {
    if (!(nextUser.role !== "admin" && nextUser.memberStatus === "frozen")) {
      return;
    }

    setDeleteTargetUser(nextUser);
    setDeleteConfirmationValue("");
    setDeleteErrorMessage(null);
  };

  const closeDeleteDialog = () => {
    setDeleteTargetUser(null);
    setDeleteConfirmationValue("");
    setDeleteErrorMessage(null);
  };

  const visibleColumnControls = useColumnVisibility({
    columns: adminUsersColumns,
    storageKey: adminUsersColumnVisibilityStorageKey,
  });
  const hasActiveFilters = hasFilters(filters);
  const listInput = useMemo(
    () => ({
      filters: hasActiveFilters ? filters : undefined,
      sort,
    }),
    [filters, hasActiveFilters, sort]
  );
  const listQueryKey = trpc.admin.users.list.queryKey(listInput);
  const usersQuery = useQuery(
    trpc.admin.users.list.queryOptions(listInput, {
      enabled: Boolean(isAdmin),
      retry: false,
    })
  );
  const metadataQuery = useQuery(
    trpc.admin.users.metadata.queryOptions(undefined, {
      enabled: Boolean(isAdmin),
      retry: false,
    })
  );
  const users = usersQuery.data?.items ?? [];
  const total = usersQuery.data?.total ?? 0;
  const deleteUser = useMutation(
    trpc.admin.users.delete.mutationOptions({
      onError: (error) => {
        setDeleteErrorMessage(getAdminEditErrorMessage(error));
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: listQueryKey });
        closeDeleteDialog();
      },
    })
  );

  const handleDeleteConfirm = async () => {
    if (!deleteTargetUser) {
      return;
    }

    setDeleteErrorMessage(null);
    await deleteUser.mutateAsync({
      userId: deleteTargetUser.id,
      usernameConfirmation: deleteConfirmationValue,
    });
  };

  useEffect(() => {
    if (!(targetUsername && isAdmin && !usersQuery.isPending)) {
      return;
    }

    const targetUser = users.find(
      (currentUser) => currentUser.username === targetUsername
    );

    if (targetUser) {
      setEditTargetUser(targetUser);
    }
  }, [isAdmin, targetUsername, users, usersQuery.isPending]);

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
      icon={<UsersRound className="size-4" />}
      title="用户列表"
    >
      <div className="grid gap-6">
        <AccessFeedback
          isAccessError={accountMe.isError}
          isCheckingAccess={isCheckingAccess}
          isMember={isMember}
          shouldPromptLogin={shouldPromptLogin}
        />

        {isAdmin ? (
          <AdminUsersTableSection
            filters={filters}
            hasActiveFilters={hasActiveFilters}
            isFetching={usersQuery.isFetching}
            isLoadError={usersQuery.isError}
            isLoading={usersQuery.isPending}
            metadata={metadataQuery.data}
            metadataIsError={metadataQuery.isError}
            metadataIsLoading={metadataQuery.isPending}
            onClearFilters={handleClearFilters}
            onDeleteUser={handleDeleteUser}
            onEditUser={handleEditUser}
            onFilterChange={handleFilterChange}
            onSortChange={handleSortChange}
            sort={sort}
            total={total}
            users={users}
            visibleColumnControls={visibleColumnControls}
          />
        ) : null}

        <AdminUserDeleteDialog
          confirmationValue={deleteConfirmationValue}
          errorMessage={deleteErrorMessage}
          isDeleting={deleteUser.isPending}
          onCancel={closeDeleteDialog}
          onConfirm={handleDeleteConfirm}
          onConfirmationChange={(value) => {
            setDeleteErrorMessage(null);
            setDeleteConfirmationValue(value);
          }}
          user={deleteTargetUser}
        />
        <AdminUserEditDialog
          listQueryKey={listQueryKey}
          onClose={closeEditDialog}
          user={editTargetUser}
        />
      </div>
    </AppShell>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<AdminUsersPageFallback />}>
      <AdminUsersPageContent />
    </Suspense>
  );
}
