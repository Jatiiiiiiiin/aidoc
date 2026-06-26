"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef } from "react";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.animation = "none";
    void el.offsetHeight; // force reflow — resets the animation timeline
    el.style.animation = "";
  }, [pathname]);

  return (
    <div ref={ref} className="doc-enter" style={{ flex: 1, minWidth: 0 }}>
      {children}
    </div>
  );
}
