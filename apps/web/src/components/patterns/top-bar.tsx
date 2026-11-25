"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export type TopBarItem = { href: string; label: string; exact?: boolean };

/**
 * The Prussian top bar (decision 014), shared by the lab app and the console.
 * Left: the wordmark. Middle: the few places used most. Right: whoever is signed in
 * and the menu. The current place is semibold with a 2px rule under it.
 */
export function TopBar({
  home,
  wordmark,
  items,
  right,
}: {
  home: string;
  wordmark: ReactNode;
  items: TopBarItem[];
  right: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 bg-bar text-on-bar">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-10 px-6 sm:px-10">
        <Link href={home} className="flex items-baseline gap-2 leading-none">
          {wordmark}
        </Link>
        <nav aria-label="Main" className="hidden h-full md:block">
          <ul className="flex h-full items-stretch gap-7">
            {items.map((item) => {
              const current = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
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
        <div className="ml-auto flex items-center gap-4">{right}</div>
      </div>
    </header>
  );
}
