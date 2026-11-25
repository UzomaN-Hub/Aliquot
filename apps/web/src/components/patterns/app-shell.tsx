"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { roleLabels } from "@/lib/format/labels";
import { cn } from "@/lib/cn";
import { useSessionStore } from "@/stores/session";

/**
 * Signed-in lab shell (designs/02 with its required fixes): lab name, role-based
 * navigation, the person and "Sign out" at the foot. No top bar, no avatar.
 * The selected item is ink, semibold, with a 2px bar on its left (decision 009).
 * Items appear here as their pages ship (DESIGN.md rule 7: 3–6 per role).
 */
export function AppShell({ children }: { children: ReactNode }) {
  const session = useSessionStore((state) => state.session);
  const pathname = usePathname();
  if (!session) return null; // the SessionGate above guarantees a session

  const base = `/l/${session.lab.slug}`;
  const items = [{ href: base, label: "Home" }];

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="flex flex-col gap-8 border-b border-hairline px-6 py-6 lg:sticky lg:top-0 lg:h-dvh lg:border-r lg:border-b-0 lg:py-8">
        <p className="font-serif text-title tracking-headline">{session.lab.name}</p>
        <nav aria-label="Main">
          <ul className="flex flex-col gap-1">
            {items.map((item) => {
              const current = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "relative block py-1.5 pl-3 text-body transition-colors",
                      current
                        ? "font-semibold text-ink before:absolute before:inset-y-1 before:left-0 before:w-0.5 before:bg-ink"
                        : "text-ink-secondary hover:text-ink",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="mt-auto flex flex-col gap-1 border-t border-hairline pt-4">
          <p className="text-body font-medium">{session.user.fullName}</p>
          <p className="text-caption text-ink-muted">
            {session.user.roles.map((role) => roleLabels[role]).join(", ")}
          </p>
          <div className="pt-1">
            <SignOutButton lab={session.lab.slug} />
          </div>
        </div>
      </aside>
      <main className="px-6 pt-12 pb-16 sm:px-10">{children}</main>
    </div>
  );
}
