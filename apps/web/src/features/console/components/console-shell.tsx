"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { AppMenu } from "@/components/patterns/app-menu";
import { PageEnter } from "@/components/patterns/page-enter";
import { TopBar } from "@/components/patterns/top-bar";
import { Wordmark } from "@/components/patterns/wordmark";
import { Button } from "@/components/ui/button";
import { firstName } from "@/lib/format/labels";
import { useConsoleSession } from "@/stores/console-session";

import { refreshConsole, signOutConsole } from "../api";

/**
 * Everything behind console sign-in: restore the session from the cookie (one tab at
 * a time), provide the data cache, then the top bar and the page.
 */
export function ConsoleShell({
  platformName,
  fallback,
  children,
}: {
  platformName: string;
  fallback: ReactNode;
  children: ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true } } }),
  );
  const router = useRouter();
  const session = useConsoleSession((state) => state.session);
  const setSession = useConsoleSession((state) => state.setSession);
  const clearSession = useConsoleSession((state) => state.clearSession);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (session) return;
    let cancelled = false;
    refreshConsole()
      .then((restored) => {
        if (cancelled) return;
        if (restored) setSession(restored);
        else router.replace("/console/sign-in");
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [session, router, setSession, attempt]);

  if (failed) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6">
        <h1 className="text-title font-medium">We can&apos;t reach the server right now.</h1>
        <p className="text-body-lg text-ink-secondary">Check your connection, then try again.</p>
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
  if (!session) return fallback;

  async function signOut() {
    setSigningOut(true);
    try {
      await signOutConsole();
    } catch {
      // Offline: still forget the session in this tab.
    } finally {
      queryClient.clear();
      clearSession();
      router.replace("/console/sign-in");
    }
  }

  const destinations = [
    { href: "/console", label: "Labs", description: "Every lab on the platform" },
    {
      href: "/console/labs/new",
      label: "Create a lab",
      description: "Add a lab and its first Manager",
    },
    { href: "/console/team", label: "Platform team", description: "Super-admins and invites" },
  ];

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-dvh">
        <TopBar
          home="/console"
          wordmark={
            <>
              <Wordmark name={platformName} className="text-figure" />
              <span className="text-body text-on-bar-muted">Console</span>
            </>
          }
          items={[
            { href: "/console", label: "Labs", exact: true, also: ["/console/labs"] },
            { href: "/console/team", label: "Team" },
          ]}
          right={
            <>
              <p className="hidden text-right leading-tight sm:block">
                <span className="block text-body font-medium">
                  {firstName(session.admin.fullName)}
                </span>
                <span className="block text-caption text-on-bar-muted">Super-admin</span>
              </p>
              <AppMenu
                name={session.admin.fullName}
                email={session.admin.email}
                detail={`Super-admin · ${platformName}`}
                destinations={destinations}
                onSignOut={() => void signOut()}
                signingOut={signingOut}
              />
            </>
          }
        />
        <main className="mx-auto max-w-[1440px] px-6 pt-12 pb-16 sm:px-10">
          <PageEnter>{children}</PageEnter>
        </main>
      </div>
    </QueryClientProvider>
  );
}
