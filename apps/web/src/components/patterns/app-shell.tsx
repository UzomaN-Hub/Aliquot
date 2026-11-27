"use client";

import type { ReactNode } from "react";

import { useSignOut } from "@/features/auth/hooks";
import { firstName, roleLabels } from "@/lib/format/labels";
import { useSessionStore } from "@/stores/session";

import { AppMenu, type MenuDestination } from "./app-menu";
import { PageEnter } from "./page-enter";
import { TopBar } from "./top-bar";

/**
 * Signed-in lab shell (decision 014): the Prussian top bar, no sidebar.
 * Destinations are added here as their pages ship (DESIGN.md rule 7: 3–6 per role).
 */
export function AppShell({ children }: { children: ReactNode }) {
  const session = useSessionStore((state) => state.session);
  const { signOut, pending } = useSignOut(session?.lab.slug ?? "");
  if (!session) return null; // the SessionGate above guarantees a session

  const base = `/l/${session.lab.slug}`;
  const destinations: MenuDestination[] = [
    { href: base, label: "Home", description: "Today at a glance" },
  ];
  const roles = session.user.roles.map((role) => roleLabels[role]);

  return (
    <div className="min-h-dvh">
      <TopBar
        home={base}
        wordmark={
          <span className="font-serif text-figure tracking-headline">{session.lab.name}</span>
        }
        items={destinations.map((item) => ({ href: item.href, label: item.label, exact: true }))}
        right={
          <>
            <p className="hidden text-right leading-tight sm:block">
              <span className="block text-body font-medium">
                {firstName(session.user.fullName)}
              </span>
              {roles[0] && <span className="block text-caption text-on-bar-muted">{roles[0]}</span>}
            </p>
            <AppMenu
              name={session.user.fullName}
              email={session.user.email}
              detail={`${roles.join(", ")} · ${session.lab.name}`}
              destinations={destinations}
              onSignOut={() => void signOut()}
              signingOut={pending}
            />
          </>
        }
      />
      <main className="mx-auto max-w-[1440px] px-6 pt-12 pb-16 sm:px-10">
        <PageEnter>{children}</PageEnter>
      </main>
    </div>
  );
}
