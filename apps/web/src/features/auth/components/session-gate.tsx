"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useSessionStore } from "@/stores/session";

import { refreshSession } from "../api";

/**
 * Guards the signed-in lab app. The access token lives only in memory, so after a
 * reload the gate asks for a new one with the httpOnly refresh cookie. No session
 * → the lab's sign-in page. A session for ANOTHER lab doesn't count
 * (ARCHITECTURE.md §8: a token for lab A on lab B is rejected).
 *
 * The cookie is scoped to /api/v1/auth, so the server can't see it on page
 * requests; this check runs in the browser (decision 013).
 */
export function SessionGate({ fallback, children }: { fallback: ReactNode; children: ReactNode }) {
  const { lab } = useParams<{ lab: string }>();
  const router = useRouter();
  const session = useSessionStore((state) => state.session);
  const setSession = useSessionStore((state) => state.setSession);
  const ready = session?.lab.slug === lab;
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (ready) return;
    let cancelled = false;
    refreshSession(lab)
      .then((restored) => {
        if (cancelled) return;
        if (restored) setSession(restored);
        else router.replace(`/l/${lab}/sign-in`);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [lab, ready, router, setSession, attempt]);

  if (failed) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6">
        <h1 className="text-title font-medium">We can&apos;t reach the lab right now.</h1>
        <p className="text-body-lg text-ink-secondary">
          Check your connection, then try again. Nothing you entered has been lost.
        </p>
        <div>
          <Button
            size="lg"
            onClick={() => {
              setFailed(false);
              setAttempt((count) => count + 1);
            }}
          >
            Try again
          </Button>
        </div>
      </main>
    );
  }
  return ready ? children : fallback;
}
