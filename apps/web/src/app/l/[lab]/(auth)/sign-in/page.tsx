import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

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
 * Lab sign-in (PAGES.md 6). The lab's own name, set large like the title page of a
 * report; the form sits to its right on a hairline. Never a centred card.
 * The address is runtime data, so the screen streams in behind Suspense.
 */
export default function SignInPage({ params }: PageProps<"/l/[lab]/sign-in">) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(420px,38%)]">
      <Suspense fallback={<SignInSkeleton />}>
        {params.then(({ lab }) => (
          <SignInScreen slug={lab} />
        ))}
      </Suspense>
    </main>
  );
}

async function SignInScreen({ slug }: { slug: string }) {
  const lab = await getLabBranding(slug);
  if (!lab) notFound();

  return (
    <>
      <section className="flex items-end border-b border-hairline px-6 pt-16 pb-8 sm:px-10 lg:border-r lg:border-b-0 lg:p-14">
        <h1 className="max-w-[14ch] font-serif text-display leading-none tracking-headline lg:text-hero">
          {lab.name}
          <span className="sr-only">: staff sign-in</span>
        </h1>
      </section>
      <section className="flex flex-col px-6 py-10 sm:px-10 lg:p-14">
        <div className="my-auto w-full max-w-sm">
          {lab.status === "active" ? (
            <SignInForm lab={lab.slug} />
          ) : (
            <Unavailable name={lab.name} />
          )}
        </div>
        <p className="mt-12 text-caption text-ink-muted">Powered by {serverConfig.PLATFORM_NAME}</p>
      </section>
    </>
  );
}

/** Suspended lab (FLOWS.md §1): staff can't sign in; data is kept. */
function Unavailable({ name }: { name: string }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-title">{name} is unavailable right now.</p>
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
      <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(420px,38%)]">
        <div className="flex items-end border-b border-hairline px-6 pt-16 pb-8 sm:px-10 lg:border-r lg:border-b-0 lg:p-14">
          <Skeleton className="h-10 w-64 lg:h-14 lg:w-96" />
        </div>
        <div className="flex flex-col justify-center gap-6 px-6 py-10 sm:px-10 lg:p-14">
          <Skeleton className="h-6 w-60" />
          <Skeleton className="h-11 w-full max-w-sm" />
          <Skeleton className="h-11 w-full max-w-sm" />
          <Skeleton className="h-11 w-28" />
        </div>
      </div>
    </SkeletonGroup>
  );
}
