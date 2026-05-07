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
import { useState } from "react";

interface AccountMenuProps {
  displayName: string;
  onLogout: () => void;
}

export function AccountMenu({ displayName, onLogout }: AccountMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu onOpenChange={(nextOpen) => setOpen(nextOpen)} open={open}>
      <DropdownMenuTrigger
        render={
          <Button
            onFocus={() => setOpen(true)}
            onMouseEnter={() => setOpen(true)}
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
      <DropdownMenuContent
        align="end"
        className="min-w-40 bg-popover/95 backdrop-blur"
      >
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <UserRound className="size-4" />
            个人信息
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onLogout} variant="destructive">
            <LogOut className="size-4" />
            注销
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
