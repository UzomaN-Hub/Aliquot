"use client";

import { useEffect, useRef, useState } from "react";

import { Wordmark } from "@/components/patterns/wordmark";
import { cn } from "@/lib/cn";

import { useToneUnder } from "../use-tone-under";
import { CtaPill } from "./cta-pill";

const LINKS = [
  { href: "#journey", label: "How it works" },
  { href: "#disciplines", label: "Sections" },
  { href: "#critical", label: "Critical alerts" },
  { href: "#safety", label: "Safety" },
  { href: "#questions", label: "Questions" },
] as const;

/**
 * Landing navigation. Prussian in light mode, graphite in dark (data-tone="bar",
 * decision 021), while the page stays Bone (decision 018). Over a dark block (the
 * disciplines section, the closing band, the footer) it turns graphite too. Phones get a round menu button that
 * opens the links full screen.
 */
export function SiteNav({
  name,
  demoProps,
}: {
  name: string;
  demoProps: React.ComponentProps<"a">;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const tone = useToneUnder(headerRef, "bottom");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header
      ref={headerRef}
      data-tone={tone}
      className={cn(
        "fixed inset-x-0 top-0 z-40 bg-surface text-ink transition-[border-color,background-color] duration-300 [[data-theme=dark]_&]:bg-surface/90 [[data-theme=dark]_&]:backdrop-blur-md",
        scrolled ? "border-b border-hairline" : "border-b border-transparent",
      )}
    >
      <nav
        aria-label="Main"
        className="mx-auto flex h-24 max-w-[1520px] items-center gap-12 px-6 sm:px-12"
      >
        <a href="#top" aria-label={`${name}, back to the top`} className="shrink-0">
          <Wordmark name={name} className="text-wordmark" />
        </a>
        <ul className="hidden items-center gap-9 xl:flex">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-[17px] text-ink-secondary transition-colors hover:text-ink"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="ml-auto flex items-center gap-4">
          <CtaPill size="md" className="hidden sm:inline-flex" {...demoProps}>
            Book a demo
          </CtaPill>
          <button
            type="button"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen(!open)}
            className="grid size-13 cursor-pointer place-items-center rounded-full border border-ink/40 xl:hidden"
          >
            <span aria-hidden="true" className="flex w-5 flex-col gap-1.5">
              <span
                className={cn(
                  "h-0.5 bg-ink transition-transform",
                  open && "translate-y-2 rotate-45",
                )}
              />
              <span className={cn("h-0.5 bg-ink transition-opacity", open && "opacity-0")} />
              <span
                className={cn(
                  "h-0.5 bg-ink transition-transform",
                  open && "-translate-y-2 -rotate-45",
                )}
              />
            </span>
          </button>
        </div>
      </nav>

      {open && (
        <div
          id="mobile-menu"
          className="h-[calc(100dvh-6rem)] overflow-y-auto border-t border-hairline px-6 pb-10 sm:px-12 xl:hidden"
        >
          <ul className="flex flex-col">
            {LINKS.map((link, i) => (
              <li key={link.href} className="border-b border-hairline">
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="flex items-baseline gap-5 py-5 font-serif text-[clamp(2rem,1.6rem+2vw,3rem)] tracking-headline"
                >
                  <span className="font-mono text-body text-primary">0{i + 1}</span>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-10" onClick={() => setOpen(false)}>
            <CtaPill {...demoProps}>Book a demo</CtaPill>
          </div>
        </div>
      )}
    </header>
  );
}
