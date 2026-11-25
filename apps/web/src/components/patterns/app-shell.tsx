"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { firstName, roleLabels } from "@/lib/format/labels";
import { cn } from "@/lib/cn";
import { useSessionStore } from "@/stores/session";

import { AppMenu, type MenuDestination } from "./app-menu";

/**
 * Signed-in lab shell (decision 014): a Prussian-blue top bar, no sidebar.
 * Left: the lab's name. Middle: the few places this role uses most (DESIGN.md rule 7).
 * Right: who is signed in and the menu with everything else.
 * Destinations are added here as their pages ship.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const session = useSessionStore((state) => state.session);
  const pathname = usePathname();
  if (!session) return null; // the SessionGate above guarantees a session

  const base = `/l/${session.lab.slug}`;
  const destinations: MenuDestination[] = [
    { href: base, label: "Home", description: "Today at a glance" },
  ];
  const primaryRole = session.user.roles[0];

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 bg-bar text-on-bar">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-10 px-6 sm:px-10">
          <Link href={base} className="font-serif text-title leading-none tracking-headline">
            {session.lab.name}
          </Link>
          <nav aria-label="Main" className="hidden h-full md:block">
            <ul className="flex h-full items-stretch gap-7">
              {destinations.map((item) => {
                const current = pathname === item.href;
                return (
                  <li key={item.href} className="flex">
                    <Link
                      href={item.href}
                      aria-current={current ? "page" : undefined}
                      className={cn(
                        "relative flex items-center text-body transition-colors",
                        current
                          ? "font-semibold text-on-bar after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-on-bar"
                          : "text-on-bar-muted hover:text-on-bar",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <p className="hidden text-right leading-tight sm:block">
              <span className="block text-body font-medium">
                {firstName(session.user.fullName)}
              </span>
              {primaryRole && (
                <span className="block text-caption text-on-bar-muted">
                  {roleLabels[primaryRole]}
                </span>
              )}
            </p>
            <AppMenu session={session} destinations={destinations} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] px-6 pt-12 pb-16 sm:px-10">{children}</main>
    </div>
  );
}
