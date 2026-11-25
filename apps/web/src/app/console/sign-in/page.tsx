import type { Metadata } from "next";

import { AuthFrame } from "@/components/patterns/auth-frame";
import { StainBackdrop } from "@/components/patterns/stain-backdrop";
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
      <AuthFrame wordmark={serverConfig.PLATFORM_NAME}>
        <ConsoleSignIn />
      </AuthFrame>
    </div>
  );
}
