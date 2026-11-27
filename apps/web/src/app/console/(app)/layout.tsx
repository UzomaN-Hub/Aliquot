import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { ConsoleShell } from "@/features/console/components/console-shell";
import { serverConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: { default: "Console", template: "%s · Console" },
  robots: { index: false, follow: false },
};

/** Everything behind console sign-in (PAGES.md A). */
export default function ConsoleLayout({ children }: LayoutProps<"/console">) {
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <ConsoleShell platformName={serverConfig.PLATFORM_NAME} fallback={<ShellSkeleton />}>
        {children}
      </ConsoleShell>
    </Suspense>
  );
}

function ShellSkeleton() {
  return (
    <SkeletonGroup label="Loading the console">
      <div className="min-h-dvh">
        <div className="h-18 bg-bar" />
        <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-6 pt-12 sm:px-10">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-10 w-64" />
        </div>
      </div>
    </SkeletonGroup>
  );
}
