import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Skeleton (DESIGN.md "Loading"): flat blocks shaped like the final layout.
 * No shimmer (the generic default). Appears only after 300 ms, so fast loads
 * never flash (`.skeleton-delay` in globals.css).
 */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("block rounded-control bg-hover", className)} />;
}

/** Wraps a skeleton layout: delayed fade-in and one spoken "Loading" for screen readers. */
export function SkeletonGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="status" className="skeleton-delay">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
