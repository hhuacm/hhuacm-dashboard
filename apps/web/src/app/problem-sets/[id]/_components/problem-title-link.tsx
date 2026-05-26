"use client";

import { Tooltip } from "@heroui/react";
import { useEffect, useState } from "react";

interface ProblemTitleLinkProps {
  href: string;
  title: string;
}

export function ProblemTitleLink({ href, title }: ProblemTitleLinkProps) {
  const [titleElement, setTitleElement] = useState<null | HTMLSpanElement>(
    null
  );
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const updateOverflowState = () => {
      const nextIsOverflowing = Boolean(
        titleElement && titleElement.scrollWidth > titleElement.clientWidth
      );

      setIsOverflowing((currentIsOverflowing) => {
        if (currentIsOverflowing === nextIsOverflowing) {
          return currentIsOverflowing;
        }

        return nextIsOverflowing;
      });
    };

    updateOverflowState();
    window.addEventListener("resize", updateOverflowState);

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(updateOverflowState);

    if (titleElement) {
      resizeObserver?.observe(titleElement);
    }

    return () => {
      window.removeEventListener("resize", updateOverflowState);
      resizeObserver?.disconnect();
    };
  }, [titleElement]);

  const link = (
    <a
      className="inline-flex min-w-0 max-w-full font-medium text-accent underline-offset-4 hover:underline focus-visible:underline"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      <span className="block min-w-0 truncate" ref={setTitleElement}>
        {title}
      </span>
    </a>
  );

  if (!isOverflowing) {
    return link;
  }

  return (
    <Tooltip delay={0}>
      <Tooltip.Trigger>{link}</Tooltip.Trigger>
      <Tooltip.Content className="wrap-break-word max-w-96" showArrow>
        <Tooltip.Arrow />
        {title}
      </Tooltip.Content>
    </Tooltip>
  );
}
