"use client";

import { Button } from "@hhuacm-dashboard/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@hhuacm-dashboard/ui/components/dropdown-menu";
import { LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface AccountMenuProps {
  displayName: string;
  onLogout: () => Promise<void>;
}

export function AccountMenu({ displayName, onLogout }: AccountMenuProps) {
  const [open, setOpen] = useState(false);

  const handleLogoutClick = () => {
    setOpen(false);
    onLogout().catch(() => undefined);
  };

  return (
    <DropdownMenu onOpenChange={(nextOpen) => setOpen(nextOpen)} open={open}>
      <DropdownMenuTrigger
        render={
          <Button
            className="max-w-56 justify-start"
            size="lg"
            variant="outline"
          />
        }
      >
        <UserRound className="size-4" />
        <span className="max-w-44 overflow-hidden text-ellipsis">
          {displayName}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => setOpen(false)}
            render={<Link href={{ pathname: "/profile" }} />}
          >
            <UserRound className="size-4" />
            个人信息
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogoutClick} variant="destructive">
            <LogOut className="size-4" />
            注销
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
