"use client";

import { useCallback, useEffect, useState } from "react";

import { calculatePageSize, defaultPageSize } from "../helpers";

export function useAutoPageSize(): {
  pageSize: number;
  tableRegionRef: (element: HTMLDivElement | null) => void;
} {
  const [tableRegionElement, setTableRegionElement] =
    useState<null | HTMLDivElement>(null);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const tableRegionRef = useCallback((element: HTMLDivElement | null) => {
    setTableRegionElement(element);
  }, []);

  useEffect(() => {
    const updatePageSize = () => {
      const nextPageSize = calculatePageSize(tableRegionElement);
      setPageSize((currentPageSize) => {
        if (currentPageSize === nextPageSize) {
          return currentPageSize;
        }

        return nextPageSize;
      });
    };

    updatePageSize();
    window.addEventListener("resize", updatePageSize);

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(updatePageSize);

    if (tableRegionElement) {
      resizeObserver?.observe(tableRegionElement);
    }

    return () => {
      window.removeEventListener("resize", updatePageSize);
      resizeObserver?.disconnect();
    };
  }, [tableRegionElement]);

  return { pageSize, tableRegionRef };
}
