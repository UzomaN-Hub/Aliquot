import type { Metadata } from "next";

import { AuthFrame } from "@/components/patterns/auth-frame";
import { StainBackdrop } from "@/components/patterns/stain-backdrop";
import { Wordmark } from "@/components/patterns/wordmark";
import { AcceptInvite } from "@/features/console/components/accept-invite";
import { serverConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Join the console",
  robots: { index: false, follow: false },
  // The page reads a secret from its own address; never leak it to other sites.
  referrer: "no-referrer",
};

/** An invited super-admin chooses a password (decision 019). Same frame as sign-in. */
export default function AcceptInvitePage() {
  return (
    <div className="relative isolate flex min-h-dvh flex-col">
      <StainBackdrop />
      <AuthFrame
        brand={<Wordmark name={serverConfig.PLATFORM_NAME} />}
        cardLabel={`${serverConfig.PLATFORM_NAME} · platform team`}
        tag="Join"
        status="Secure link"
        help="Link not working? Ask the super-admin who invited you for a new one."
      >
        <AcceptInvite platformName={serverConfig.PLATFORM_NAME} />
      </AuthFrame>
    </div>
  );
}
