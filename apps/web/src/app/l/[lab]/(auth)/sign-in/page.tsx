import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AuthCard, AuthFrame, AuthLead, AuthTitle } from "@/components/patterns/auth-frame";
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
    <AuthFrame
      brand={lab.name}
      cardLabel={`${lab.name} · staff`}
      tag="Sign in"
      help={labHelp}
      credit={`Powered by ${serverConfig.PLATFORM_NAME}`}
    >
      {lab.status === "active" ? (
        <>
          <AuthTitle lead="Welcome" accent="back" />
          <AuthLead>Sign in to {lab.name} with your work email.</AuthLead>
          <SignInForm lab={lab.slug} />
        </>
      ) : (
        <>
          {/* Suspended lab (FLOWS.md §1): staff can't sign in; data is kept. */}
          <AuthTitle lead={`${lab.name} is unavailable`} accent="right now" />
          <p className="mt-4 animate-rise text-body-lg text-ink-secondary [animation-delay:250ms]">
            Staff can&apos;t sign in at the moment. Your lab&apos;s records are safe. Contact your
            lab manager for help.
          </p>
        </>
      )}
    </AuthFrame>
  );
}

/** Staff don't contact the platform directly: their lab manager runs their account. */
const labHelp = "Need help? Ask your lab manager.";

function SignInSkeleton() {
  return (
    <SkeletonGroup label="Loading sign-in">
      <div className="flex min-h-dvh flex-col">
        <div className="px-6 pt-6 sm:px-12 sm:pt-8">
          <Skeleton className="h-10 w-56 sm:h-14 sm:w-80" />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 py-10 sm:py-14">
          <AuthCard cardLabel={<Skeleton className="h-3 w-32" />} tag="Sign in" help="">
            <div className="flex flex-col gap-8">
              <Skeleton className="h-12 w-64" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-15 w-full" />
            </div>
          </AuthCard>
        </div>
      </div>
    </SkeletonGroup>
  );
}
