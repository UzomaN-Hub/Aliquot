"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/cn";

import { AliquotFigure } from "./aliquot-figure";

const TABS = [
  {
    label: "Chemical Pathology",
    lane: "0",
    caption: "Values, units and ranges by sex and age.",
    detail: "Critical limits flag themselves.",
  },
  {
    label: "Haematology",
    lane: "1",
    caption: "Every FBC parameter and a differential.",
    detail: "Film comments, ESR, group and genotype.",
  },
  {
    label: "Microbiology",
    lane: "2",
    caption: "Work that spans days, stage by stage.",
    detail: "Preliminary first, final locks.",
  },
  {
    label: "Delivery",
    lane: "all",
    caption: "Verified, released, delivered.",
    detail: "Secure links, branded PDFs.",
  },
] as const;

const CYCLE_MS = 4800;

/**
 * The hero figure with its tab "carousel": the tabs cycle on their own (a progress
 * line fills under the active one), each lighting up its lane in the figure.
 * Hover or focus pauses; a click chooses. With motion off, it stays still.
 */
export function HeroShowcase() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    const sync = () => setMoving(document.documentElement.classList.contains("motion-on"));
    sync();
    window.addEventListener("motionchange", sync);
    return () => window.removeEventListener("motionchange", sync);
  }, []);

  useEffect(() => {
    if (!moving || paused) return;
    const timer = setTimeout(() => setActive((i) => (i + 1) % TABS.length), CYCLE_MS);
    return () => clearTimeout(timer);
  }, [active, moving, paused]);

  const tab = TABS[active] ?? TABS[0];

  return (
    <div
      className="flex flex-col gap-6"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="flex items-center justify-between border-b border-hairline pb-4 font-mono text-caption text-ink-muted uppercase">
        <span>One sample, three sections</span>
        <span>Model / 0{active + 1}</span>
      </div>

      <div
        data-hero-figure
        data-reveal
        data-active-lane={tab.lane}
        className="mx-auto w-full max-w-[460px]"
      >
        <AliquotFigure />
      </div>

      <div role="tablist" aria-label="What happens to a sample" className="grid grid-cols-4 gap-3">
        {TABS.map((item, i) => {
          const selected = i === active;
          return (
            <button
              key={item.label}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls="hero-tab-panel"
              onClick={() => setActive(i)}
              className="group flex cursor-pointer flex-col gap-2 text-left"
            >
              <span className="relative h-0.5 overflow-hidden bg-hairline">
                <span
                  key={`${active}-${moving && !paused}`}
                  className={cn(
                    "absolute inset-y-0 left-0 bg-primary",
                    selected ? (moving && !paused ? "hero-progress" : "w-full") : "w-0",
                  )}
                  style={{ animationDuration: `${CYCLE_MS}ms` }}
                />
              </span>
              <span className="flex items-baseline gap-2 text-body">
                <span className="font-mono text-caption text-ink-muted">0{i + 1}</span>
                <span className={selected ? "text-ink" : "text-ink-muted group-hover:text-ink"}>
                  {item.label}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div
        id="hero-tab-panel"
        role="tabpanel"
        aria-live="polite"
        className="flex items-end justify-between gap-6"
      >
        <div key={active} className="switcher-panel flex flex-col gap-1">
          <p className="text-title">{tab.caption}</p>
          <p className="text-body-lg text-ink-secondary">{tab.detail}</p>
        </div>
      </div>
    </div>
  );
}
