import type { Metadata } from "next";
import { Suspense } from "react";

import { AppShell } from "@/components/patterns/app-shell";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { SessionGate } from "@/features/auth/components/session-gate";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Everything behind sign-in for one lab: the session gate, then the shell. */
export default function LabAppLayout({ children }: LayoutProps<"/l/[lab]">) {
  // The gate reads the lab from the URL (runtime data), so it streams in behind
  // Suspense; the skeleton is the prerendered shell (Cache Components).
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <SessionGate fallback={<ShellSkeleton />}>
        <AppShell>{children}</AppShell>
      </SessionGate>
    </Suspense>
  );
}

function ShellSkeleton() {
  return (
    <SkeletonGroup label="Loading your workspace">
      <div className="min-h-dvh">
        <div className="h-16 bg-bar" />
        <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-6 pt-12 sm:px-10">
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-6 w-64" />
        </div>
      </div>
    </SkeletonGroup>
  );
}
