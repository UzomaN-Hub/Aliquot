import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { StainBackdrop } from "@/components/patterns/stain-backdrop";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { SignInForm } from "@/features/auth/components/sign-in-form";
import { serverConfig } from "@/lib/config";
import { getLabBranding } from "@/lib/tenancy/branding";

export async function generateMetadata({
  params,
}: PageProps<"/l/[lab]/sign-in">): Promise<Metadata> {
  const lab = await getLabBranding((await params).lab);
  return {
    title: lab ? `Sign in · ${lab.name}` : "Sign in",
    robots: { index: false, follow: false },
  };
}

/**
 * Lab sign-in (PAGES.md 6, decision 014). The lab's name stands bold at the top
 * left; one generous form panel sits in the centre over a slowly drifting, blurred
 * blood film. The backdrop is static markup, so it paints before the lab's data
 * arrives; the rest streams in behind Suspense.
 */
export default function SignInPage({ params }: PageProps<"/l/[lab]/sign-in">) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col">
      <StainBackdrop />
      <Suspense fallback={<SignInSkeleton />}>
        {params.then(({ lab }) => (
          <SignInScreen slug={lab} />
        ))}
      </Suspense>
    </div>
  );
}

async function SignInScreen({ slug }: { slug: string }) {
  const lab = await getLabBranding(slug);
  if (!lab) notFound();

  return (
    <>
      <header className="flex items-start justify-between gap-6 px-6 pt-6 sm:px-10 sm:pt-8">
        <p className="max-w-[18ch] font-serif text-figure leading-none tracking-headline sm:text-display">
          {lab.name}
        </p>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-[440px] rounded-panel border border-hairline bg-surface-raised px-7 py-12 shadow-overlay sm:px-12 sm:py-14">
          {lab.status === "active" ? (
            <>
              <h1 className="text-figure font-medium">
                Sign in<span className="sr-only"> to {lab.name}</span>
              </h1>
              <p className="mt-2 mb-9 text-body-lg text-ink-secondary">Use your work email.</p>
              <SignInForm lab={lab.slug} />
            </>
          ) : (
            <Unavailable name={lab.name} />
          )}
        </div>
      </main>

      <footer className="px-6 pb-6 text-center text-caption text-ink-muted sm:px-10">
        Powered by {serverConfig.PLATFORM_NAME}
      </footer>
    </>
  );
}

/** Suspended lab (FLOWS.md §1): staff can't sign in; data is kept. */
function Unavailable({ name }: { name: string }) {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-title font-medium">{name} is unavailable right now.</h1>
      <p className="text-body-lg text-ink-secondary">
        Staff can&apos;t sign in at the moment. Your lab&apos;s records are safe. Contact your lab
        manager for help.
      </p>
    </div>
  );
}

function SignInSkeleton() {
  return (
    <SkeletonGroup label="Loading sign-in">
      <div className="flex min-h-dvh flex-col">
        <div className="px-6 pt-6 sm:px-10 sm:pt-8">
          <Skeleton className="h-8 w-56 sm:h-10 sm:w-72" />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="flex w-full max-w-[440px] flex-col gap-6 rounded-panel border border-hairline bg-surface-raised px-7 py-12 sm:px-12 sm:py-14">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        </div>
      </div>
    </SkeletonGroup>
  );
}
