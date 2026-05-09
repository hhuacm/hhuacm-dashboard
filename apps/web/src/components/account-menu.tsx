"use client";

import { Button, Dropdown, Label, Separator } from "@heroui/react";
import { LogOut, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Key } from "react";
import { useState } from "react";

interface AccountMenuProps {
  displayName: string;
  onLogout: () => Promise<void>;
}

export function AccountMenu({ displayName, onLogout }: AccountMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    setOpen(false);
    onLogout().catch(() => undefined);
  };

  const handleAction = (key: Key) => {
    if (key === "profile") {
      setOpen(false);
      router.push("/profile");
      return;
    }

    if (key === "logout") {
      handleLogout();
    }
  };

  return (
    <Dropdown isOpen={open} onOpenChange={(nextOpen) => setOpen(nextOpen)}>
      <Button
        aria-label="打开账号菜单"
        className="max-w-56 justify-start"
        size="lg"
        variant="outline"
      >
        <UserRound className="size-4" />
        <span className="max-w-44 overflow-hidden text-ellipsis">
          {displayName}
        </span>
      </Button>
      <Dropdown.Popover className="min-w-44" placement="bottom end">
        <Dropdown.Menu onAction={handleAction}>
          <Dropdown.Item id="profile" textValue="个人信息">
            <UserRound className="size-4" />
            <Label>个人信息</Label>
          </Dropdown.Item>
          <Separator />
          <Dropdown.Item id="logout" textValue="注销" variant="danger">
            <LogOut className="size-4" />
            <Label>注销</Label>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
