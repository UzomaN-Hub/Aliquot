"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";

export const BAR_SECTIONS = [
  { id: "problem", label: "Problem" },
  { id: "journey", label: "Journey" },
  { id: "disciplines", label: "Sections" },
  { id: "critical", label: "Critical" },
  { id: "delivery", label: "Delivery" },
  { id: "safety", label: "Safety" },
  { id: "people", label: "Roles" },
  { id: "next", label: "Next" },
  { id: "questions", label: "Questions" },
] as const;

/**
 * The sticky section bar (decision 018): a pill at the bottom of the screen, Prussian
 * in light mode and graphite in dark (decision 021),
 * listing every section. The one you're reading lights up; a thin line underneath
 * grows with your progress down the page. It appears after the hero and steps aside
 * for the footer. On phones it scrolls sideways and keeps the current one in view.
 */
export function SectionBar() {
  const [active, setActive] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const sections = BAR_SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    // A section counts as "current" while it crosses the middle of the screen.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    sections.forEach((section) => observer.observe(section));

    const first = sections[0];
    const footer = document.querySelector("footer");
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? window.scrollY / max : 0);
      const start = first ? first.offsetTop - window.innerHeight * 0.6 : 0;
      const end = footer ? footer.getBoundingClientRect().top - window.innerHeight * 0.85 : 1;
      setVisible(window.scrollY > start && end > 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    const item = listRef.current?.querySelector<HTMLElement>(`[data-bar="${active}"]`);
    item?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [active]);

  return (
    <nav
      aria-label="Sections"
      data-tone="bar"
      className={cn(
        "fixed inset-x-3 bottom-4 z-30 mx-auto w-fit max-w-[calc(100vw-1.5rem)] rounded-full bg-surface p-1.5 text-ink shadow-overlay [[data-theme=dark]_&]:bg-surface/95 [[data-theme=dark]_&]:backdrop-blur-md transition-[opacity,transform] duration-500",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0",
      )}
    >
      <ul
        ref={listRef}
        className="flex max-w-full items-center gap-1 overflow-x-auto [scrollbar-width:none]"
      >
        {BAR_SECTIONS.map((section, i) => {
          const current = section.id === active;
          return (
            <li key={section.id} data-bar={section.id} className="shrink-0">
              <a
                href={`#${section.id}`}
                aria-current={current ? "location" : undefined}
                className={cn(
                  "flex items-baseline gap-1.5 rounded-full px-4 py-2.5 text-body transition-colors duration-300",
                  current ? "bg-ink text-surface" : "text-ink-secondary hover:text-ink",
                )}
              >
                <span
                  className={cn(
                    "font-mono text-[11px]",
                    current ? "text-surface/60" : "text-ink-muted",
                  )}
                >
                  0{i + 1}
                </span>
                {section.label}
              </a>
            </li>
          );
        })}
      </ul>
      <span
        aria-hidden="true"
        className="absolute inset-x-6 -bottom-0 h-0.5 overflow-hidden rounded-full"
      >
        <span
          className="block h-full origin-left bg-eosin"
          style={{ transform: `scaleX(${progress})` }}
        />
      </span>
    </nav>
  );
}
