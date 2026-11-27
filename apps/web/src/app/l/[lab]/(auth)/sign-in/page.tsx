import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AuthFrame } from "@/components/patterns/auth-frame";
import { StainBackdrop } from "@/components/patterns/stain-backdrop";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
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
 * Lab sign-in (PAGES.md 6, decision 014). The backdrop is static markup, so it
 * paints before the lab's data arrives; the rest streams in behind Suspense.
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
    <AuthFrame wordmark={lab.name} footer={`Powered by ${serverConfig.PLATFORM_NAME}`}>
      {lab.status === "active" ? (
        <>
          <h1 className="text-figure font-medium">
            Sign in<span className="sr-only"> to {lab.name}</span>
          </h1>
          <p className="mt-2 mb-9 text-body-lg text-ink-secondary">Use your work email.</p>
          <SignInForm lab={lab.slug} />
        </>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Suspended lab (FLOWS.md §1): staff can't sign in; data is kept. */}
          <h1 className="text-title font-medium">{lab.name} is unavailable right now.</h1>
          <p className="text-body-lg text-ink-secondary">
            Staff can&apos;t sign in at the moment. Your lab&apos;s records are safe. Contact your
            lab manager for help.
          </p>
        </div>
      )}
    </AuthFrame>
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
          <div
            data-surface
            className="flex w-full max-w-[460px] flex-col gap-6 rounded-panel border border-hairline bg-surface-raised px-7 py-12 sm:px-12 sm:py-14"
          >
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
