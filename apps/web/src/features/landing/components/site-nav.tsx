"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "#journey", label: "How it works" },
  { href: "#disciplines", label: "Sections" },
  { href: "#safety", label: "Safety" },
  { href: "#questions", label: "Questions" },
] as const;

/**
 * Landing navigation: transparent over the hero, a quiet Bone (or graphite) band
 * once the page scrolls. Links collapse into the page on phones; the one action stays.
 */
export function SiteNav({ name, demoHref }: { name: string; demoHref: string }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-colors duration-300",
        scrolled
          ? "border-b border-hairline bg-surface/85 backdrop-blur-md"
          : "border-b border-transparent",
      )}
    >
      <nav
        aria-label="Main"
        className="mx-auto flex h-18 max-w-[1440px] items-center gap-10 px-6 sm:px-10"
      >
        <a href="#top" className="font-serif text-[28px] leading-none tracking-headline">
          {name}
        </a>
        <ul className="hidden items-center gap-8 lg:flex">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-body text-ink-secondary transition-colors hover:text-ink"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="ml-auto">
          <Button variant="marketing" asChild className="h-10 px-5 text-body">
            <a href={demoHref}>Book a demo</a>
          </Button>
        </div>
      </nav>
    </header>
  );
}
