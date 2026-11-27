import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AuthFrame } from "@/components/patterns/auth-frame";
import { StainBackdrop } from "@/components/patterns/stain-backdrop";
import { SetPasswordForm } from "@/features/auth/components/set-password-form";
import { serverConfig } from "@/lib/config";
import { getLabBranding } from "@/lib/tenancy/branding";

export const metadata: Metadata = {
  title: "Set your password",
  robots: { index: false, follow: false },
  // The page reads a secret from its own address; never leak it to other sites.
  referrer: "no-referrer",
};

/** Set password from an invite or reset link (PAGES.md 8). */
export default function SetPasswordPage({ params }: PageProps<"/l/[lab]/set-password">) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col">
      <StainBackdrop />
      <Suspense>
        {params.then(({ lab }) => (
          <SetPasswordScreen slug={lab} />
        ))}
      </Suspense>
    </div>
  );
}

async function SetPasswordScreen({ slug }: { slug: string }) {
  const lab = await getLabBranding(slug);
  if (!lab) notFound();
  return (
    <AuthFrame
      brand={lab.name}
      cardLabel={`${lab.name} · staff`}
      tag="Set password"
      status="Secure link"
      help="Link not working? Ask your lab manager for a new one."
      credit={`Powered by ${serverConfig.PLATFORM_NAME}`}
    >
      <SetPasswordForm lab={lab.slug} />
    </AuthFrame>
  );
}
