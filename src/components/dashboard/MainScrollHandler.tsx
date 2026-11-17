"use client";
import { usePathname } from "next/navigation";
import * as React from "react";

export function MainScrollHandler() {
  const pathname = usePathname();
  const prev = React.useRef(pathname);
  React.useEffect(() => {
    if (prev.current !== pathname) {
      const el = document.getElementById("dashboard-main");
      if (el) el.scrollTo({ top: 0, behavior: "instant" as any });
      prev.current = pathname;
    }
  }, [pathname]);
  return null;
}
