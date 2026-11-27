import type { Metadata } from "next";

import { AuthFrame } from "@/components/patterns/auth-frame";
import { StainBackdrop } from "@/components/patterns/stain-backdrop";
import { Wordmark } from "@/components/patterns/wordmark";
import { ConsoleSignIn } from "@/features/console/components/console-sign-in";
import { serverConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Console sign-in",
  robots: { index: false, follow: false },
};

/** Super-admin sign-in (PAGES.md 1): same frame as lab sign-in, platform's own name. */
export default function ConsoleSignInPage() {
  return (
    <div className="relative isolate flex min-h-dvh flex-col">
      <StainBackdrop />
      <AuthFrame
        brand={<Wordmark name={serverConfig.PLATFORM_NAME} />}
        cardLabel={`${serverConfig.PLATFORM_NAME} · platform console`}
        tag="Sign in"
        help="Locked out? Another super-admin can reset your two-step sign-in."
      >
        <ConsoleSignIn />
      </AuthFrame>
    </div>
  );
}
