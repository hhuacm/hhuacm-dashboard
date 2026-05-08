"use client";

import { Button } from "@hhuacm-dashboard/ui/components/button";
import { Input } from "@hhuacm-dashboard/ui/components/input";
import { Label } from "@hhuacm-dashboard/ui/components/label";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BadgeCheck, Save, UserRound } from "lucide-react";
import Link from "next/link";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useId,
  useState,
} from "react";

import { authClient, getPreferredUsername } from "@/utils/auth-client";
import {
  buildProfileFormValues,
  emptyProfileFormValues,
  getProfileDisplayValue,
  type ProfileFieldKey,
  type ProfileFormValues,
  profileFieldConfigs,
} from "@/utils/profile-fields";
import { trpc } from "@/utils/trpc";

export default function ProfilePage() {
  const session = authClient.useSession();
  const user = session.data?.user ?? null;
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();
  const realNameId = useId();
  const gradeId = useId();
  const studentIdId = useId();
  const majorId = useId();
  const [formValues, setFormValues] = useState<ProfileFormValues>(
    emptyProfileFormValues
  );
  const [profileMessage, setProfileMessage] = useState<null | string>(null);
  const profileQuery = useQuery(
    trpc.profile.get.queryOptions(undefined, {
      enabled: Boolean(userId),
    })
  );
  const updateProfile = useMutation(
    trpc.profile.update.mutationOptions({
      onError: () => {
        setProfileMessage("保存失败，请稍后再试。");
      },
      onSuccess: (profile) => {
        queryClient.setQueryData(trpc.profile.get.queryKey(), profile);
        setFormValues(buildProfileFormValues(profile));
        setProfileMessage("个人信息已保存。");
      },
    })
  );
  const fieldIds: Record<ProfileFieldKey, string> = {
    grade: gradeId,
    major: majorId,
    realName: realNameId,
    studentId: studentIdId,
  };
  let profileContent: ReactNode;

  useEffect(() => {
    if (!userId) {
      setFormValues(emptyProfileFormValues);
      return;
    }

    if (profileQuery.data) {
      setFormValues(buildProfileFormValues(profileQuery.data));
    }
  }, [profileQuery.data, userId]);

  const handleProfileInputChange = (field: ProfileFieldKey, value: string) => {
    setProfileMessage(null);
    setFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  };

  const handleProfileSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileMessage(null);
    updateProfile.mutate(formValues);
  };

  if (session.isPending) {
    profileContent = (
      <div className="grid gap-3">
        <p className="font-semibold text-2xl">正在确认登录状态</p>
        <p className="text-muted-foreground">
          请稍候，正在从认证服务读取当前会话。
        </p>
      </div>
    );
  } else if (user) {
    profileContent = (
      <div className="grid gap-7">
        <div className="flex items-start gap-4">
          <div className="grid size-12 shrink-0 place-items-center border border-sky-200 bg-sky-50 text-sky-700">
            <BadgeCheck className="size-5" />
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Signed in as</p>
            <h1 className="mt-1 break-all font-semibold text-3xl">
              {getPreferredUsername(user)}
            </h1>
          </div>
        </div>

        <dl className="grid gap-4 sm:grid-cols-3">
          <div className="border border-sky-100 bg-sky-50/45 p-4">
            <dt className="text-muted-foreground text-sm">用户名</dt>
            <dd className="mt-2 break-all font-medium text-lg">
              {getPreferredUsername(user)}
            </dd>
          </div>
          <div className="border border-sky-100 bg-sky-50/45 p-4">
            <dt className="text-muted-foreground text-sm">邮箱</dt>
            <dd className="mt-2 break-all font-medium text-lg">{user.email}</dd>
          </div>
          <div className="border border-sky-100 bg-sky-50/45 p-4">
            <dt className="text-muted-foreground text-sm">用户 ID</dt>
            <dd className="mt-2 break-all font-medium text-lg">{user.id}</dd>
          </div>
        </dl>

        <section className="grid gap-5 border-sky-100 border-t pt-7">
          <div>
            <h2 className="font-semibold text-xl">个人信息</h2>
            {profileQuery.isPending ? (
              <p className="mt-2 text-muted-foreground text-sm">
                正在读取个人信息。
              </p>
            ) : null}
            {profileQuery.isError ? (
              <p className="mt-2 text-destructive text-sm" role="alert">
                个人信息加载失败，请刷新页面重试。
              </p>
            ) : null}
          </div>

          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {profileFieldConfigs.map((field) => (
              <div
                className="border border-sky-100 bg-sky-50/45 p-4"
                key={field.key}
              >
                <dt className="text-muted-foreground text-sm">{field.label}</dt>
                <dd className="mt-2 break-all font-medium text-lg">
                  {getProfileDisplayValue(profileQuery.data?.[field.key])}
                </dd>
              </div>
            ))}
          </dl>

          <form className="grid gap-5" onSubmit={handleProfileSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              {profileFieldConfigs.map((field) => (
                <div className="grid gap-2" key={field.key}>
                  <Label htmlFor={fieldIds[field.key]}>{field.label}</Label>
                  <Input
                    autoComplete={field.autoComplete}
                    disabled={profileQuery.isPending || updateProfile.isPending}
                    id={fieldIds[field.key]}
                    name={field.key}
                    onChange={(event) =>
                      handleProfileInputChange(field.key, event.target.value)
                    }
                    placeholder="未填写"
                    value={formValues[field.key]}
                  />
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                disabled={profileQuery.isPending || updateProfile.isPending}
                size="lg"
                type="submit"
              >
                <Save className="size-4" />
                {updateProfile.isPending ? "保存中" : "保存"}
              </Button>
              {profileMessage ? (
                <p
                  aria-live="polite"
                  className="text-muted-foreground text-sm"
                  role="status"
                >
                  {profileMessage}
                </p>
              ) : null}
            </div>
          </form>
        </section>
      </div>
    );
  } else {
    profileContent = (
      <div className="grid gap-5">
        <div>
          <p className="font-semibold text-2xl">尚未登录</p>
          <p className="mt-3 text-muted-foreground">
            回到首页完成登录后，这里会显示你的用户名和用户 ID。
          </p>
        </div>
        <div>
          <Button nativeButton={false} render={<Link href="/" />} size="lg">
            返回首页
          </Button>
        </div>
      </div>
    );
  }

  return (
    <main className="relative min-h-svh overflow-hidden bg-[linear-gradient(180deg,#f8fdff_0%,#edf8ff_48%,#ffffff_100%)] text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(14,165,233,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(14,165,233,0.055)_1px,transparent_1px)] bg-[size:56px_56px]" />
      <div className="relative mx-auto flex min-h-svh w-full max-w-4xl flex-col px-5 py-5 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-4 border-sky-100/80 border-b bg-background/70 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center border border-sky-200 bg-sky-50 text-sky-700 shadow-sky-100 shadow-sm">
              <UserRound className="size-4" />
            </div>
            <div>
              <p className="font-semibold text-base leading-none">个人信息</p>
              <p className="mt-1 text-muted-foreground text-xs">
                HHUACM Dashboard
              </p>
            </div>
          </div>

          <Button
            nativeButton={false}
            render={<Link href="/" />}
            size="lg"
            variant="outline"
          >
            <ArrowLeft className="size-4" />
            返回首页
          </Button>
        </header>

        <section className="grid flex-1 content-center py-12">
          <div className="border border-sky-100 bg-card/90 p-6 shadow-sky-950/5 shadow-xl backdrop-blur sm:p-8">
            {profileContent}
          </div>
        </section>
      </div>
    </main>
  );
}
