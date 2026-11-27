"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Each page settles in when you arrive (decision 020): a short rise, under half a
 * second, CSS only. Keyed by address, so moving between two pages of the same kind
 * (one lab's detail to another's) plays it again.
 */
export function PageEnter({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-page">
      {children}
    </div>
  );
}
