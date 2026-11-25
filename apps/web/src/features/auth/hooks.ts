"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { useSessionStore } from "@/stores/session";

import { signOut } from "./api";

/** Sign out of this device. Even if the server can't be reached, this tab forgets the
 *  session; the refresh token then expires on its own. */
export function useSignOut(lab: string) {
  const router = useRouter();
  const clearSession = useSessionStore((state) => state.clearSession);
  const [pending, setPending] = useState(false);

  const run = useCallback(async () => {
    setPending(true);
    try {
      await signOut(lab);
    } catch {
      // Network down: still forget the session locally (above).
    } finally {
      clearSession();
      router.replace(`/l/${lab}/sign-in`);
    }
  }, [clearSession, lab, router]);

  return { signOut: run, pending };
}
