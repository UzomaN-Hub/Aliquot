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
      <div className="min-h-dvh lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
        <div className="flex flex-col gap-8 border-b border-hairline px-6 py-6 lg:h-dvh lg:border-r lg:border-b-0 lg:py-8">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-5 w-20" />
        </div>
        <div className="flex flex-col gap-3 px-6 pt-12 sm:px-10">
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-6 w-64" />
        </div>
      </div>
    </SkeletonGroup>
  );
}
