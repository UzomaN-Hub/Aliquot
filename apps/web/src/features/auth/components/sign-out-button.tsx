"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useSessionStore } from "@/stores/session";

import { signOut } from "../api";

/** Ends this device's session. Even if the server can't be reached, this tab forgets the
 *  session; the refresh token then expires on its own. */
export function SignOutButton({ lab }: { lab: string }) {
  const router = useRouter();
  const clearSession = useSessionStore((state) => state.clearSession);
  const [pending, setPending] = useState(false);

  return (
    <Button
      variant="link"
      pending={pending}
      pendingLabel="Signing out…"
      onClick={async () => {
        setPending(true);
        try {
          await signOut(lab);
        } finally {
          clearSession();
          router.replace(`/l/${lab}/sign-in`);
        }
      }}
    >
      Sign out
    </Button>
  );
}
