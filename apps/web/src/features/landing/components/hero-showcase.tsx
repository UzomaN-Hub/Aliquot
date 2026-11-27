"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { cn } from "@/lib/cn";

import { AliquotFigure } from "./aliquot-figure";

// Each tab lights a lane of the figure and swaps the floating result card.
// Fictional values only (CLAUDE.md: seed and demo data are never real people).
const TABS = [
  {
    label: "Chemical Pathology",
    lane: "0",
    caption: "Values, units and ranges by sex and age.",
    detail: "Critical limits flag themselves.",
    card: {
      test: "Potassium",
      value: "6.8",
      unit: "mmol/L",
      flag: "CH↑",
      tone: "critical",
      note: "Critical: doctor alerted",
    },
  },
  {
    label: "Haematology",
    lane: "1",
    caption: "Every FBC parameter and a differential.",
    detail: "Film comments, ESR, group and genotype.",
    card: {
      test: "WBC",
      value: "11.8",
      unit: "×10⁹/L",
      flag: "H↑",
      tone: "high",
      note: "Above range: flagged",
    },
  },
  {
    label: "Microbiology",
    lane: "2",
    caption: "Work that spans days, stage by stage.",
    detail: "Preliminary first, final locks.",
    card: {
      test: "Urine culture",
      value: "E. coli",
      unit: "> 10⁵ CFU/mL",
      flag: "",
      tone: "plain",
      note: "Day 2: preliminary report",
    },
  },
  {
    label: "Delivery",
    lane: "all",
    caption: "Verified, released, delivered.",
    detail: "Secure links, branded PDFs.",
    card: {
      test: "Released",
      value: "10:42",
      unit: "T. Bakare",
      flag: "",
      tone: "plain",
      note: "Signed by the Chief Scientist",
    },
  },
] as const;

const CYCLE_MS = 4800;
// A barcode that reads as one (varied bar widths), not stripes.
const BARS = [3, 1, 2, 1, 1, 3, 1, 2, 2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 1, 3, 1, 2];

/**
 * A layer floating over the figure: placed (outer, moved by the pointer in
 * start-motion.ts), arriving (middle, CSS), and drifting (inner, CSS). Three
 * elements so the three transforms never fight. Decorative: the figure has its title.
 */
function Floating({
  className,
  depth,
  delay,
  drift,
  children,
}: {
  className: string;
  depth: number;
  delay: number;
  drift: number;
  children: ReactNode;
}) {
  return (
    <div aria-hidden="true" data-depth={depth} className={cn("absolute z-10", className)}>
      <div className="hero-fade" style={{ "--d": `${delay}ms` } as CSSProperties}>
        <div className="hero-float" style={{ "--f": `${drift}s` } as CSSProperties}>
          {children}
        </div>
      </div>
    </div>
  );
}

const card =
  "rounded-panel border border-hairline bg-surface-raised shadow-overlay px-4 py-3 flex flex-col gap-1.5";

/**
 * The hero figure with its tab carousel: the tabs cycle on their own (a progress line
 * fills under the active one); each lights its lane, sends a burst of portions into it
 * and swaps the result card. Hovering the tabs pauses; a click chooses. Motion off:
 * everything stays still and complete.
 */
export function HeroShowcase() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [moving, setMoving] = useState(false);
  const first = useRef(true);

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

  // Tell the figure's animation which lane to send a burst into.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    window.dispatchEvent(new CustomEvent("herotab", { detail: tab.lane }));
  }, [tab.lane]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-hairline pb-4 font-mono text-caption text-ink-muted uppercase">
        <span>One sample, three sections</span>
        <span>Model / 0{active + 1}</span>
      </div>

      <div data-hero-stage className="relative mx-auto w-full max-w-[580px] px-[11%]">
        <div data-depth="0.25">
          <div data-hero-figure data-reveal data-active-lane={tab.lane}>
            <AliquotFigure />
          </div>
        </div>

        {/* The sample's label, being scanned */}
        <Floating className="top-[3%] left-0 hidden sm:block" depth={0.9} delay={1700} drift={5.5}>
          <div data-surface className={card}>
            <span className="font-mono text-caption text-ink-muted uppercase">Lab number</span>
            <span className="font-mono text-body-lg text-ink">TAV-26-00148</span>
            <span className="relative flex h-9 w-36 items-stretch gap-px overflow-hidden">
              {BARS.map((width, i) => (
                <span key={i} className="bg-ink" style={{ width: `${width + 1}px` }} />
              ))}
              <span className="hero-scan absolute inset-y-0 left-0 w-0.5 bg-eosin" />
            </span>
            <span className="text-caption text-ink-muted">Received 08:14 · EDTA</span>
          </div>
        </Floating>

        {/* The active section's result, swapped with the tab */}
        <Floating className="top-[1%] right-[-4%] sm:right-0" depth={1.3} delay={2000} drift={6.5}>
          <div data-surface className={cn(card, "w-38 sm:w-52")}>
            <div key={active} className="switcher-panel flex flex-col gap-1.5">
              <span className="text-caption text-ink-muted">{tab.card.test}</span>
              <span className="flex items-baseline gap-2">
                <span
                  className={cn(
                    "font-mono text-figure",
                    tab.card.tone === "critical" ? "text-eosin-text" : "text-ink",
                  )}
                >
                  {tab.card.value}
                </span>
                <span className="font-mono text-caption text-ink-muted">{tab.card.unit}</span>
                {tab.card.flag && (
                  <span
                    className={cn(
                      "ml-auto font-mono text-body font-semibold",
                      tab.card.tone === "critical" ? "text-eosin-text" : "text-primary",
                    )}
                  >
                    {tab.card.flag}
                  </span>
                )}
              </span>
              <span className="border-t border-hairline pt-1.5 text-caption text-ink-secondary">
                {tab.card.note}
              </span>
            </div>
          </div>
        </Floating>

        {/* A turning stamp: what every result ends as */}
        <Floating className="top-[40%] left-[-1%]" depth={0.6} delay={2300} drift={7}>
          <svg viewBox="0 0 120 120" className="hero-spin size-24 sm:size-28">
            <defs>
              <path
                id="hero-stamp-ring"
                d="M 60 60 m -46 0 a 46 46 0 1 1 92 0 a 46 46 0 1 1 -92 0"
              />
            </defs>
            <circle cx="60" cy="60" r="58" className="fill-surface stroke-hairline" />
            <text className="fill-ink-secondary font-mono text-[11.5px] tracking-[0.18em] uppercase">
              <textPath href="#hero-stamp-ring">Verified · released · delivered · </textPath>
            </text>
            <circle cx="60" cy="60" r="7" className="fill-eosin" />
          </svg>
        </Floating>

        {/* The patient's message going out */}
        <Floating
          className="right-[-2%] bottom-[15%] hidden sm:block"
          depth={1.1}
          delay={2600}
          drift={6}
        >
          <div data-surface className={cn(card, "flex-row items-center gap-3 py-2.5")}>
            <span className="font-mono text-body font-semibold text-primary">✓✓</span>
            <span className="flex flex-col">
              <span className="text-body text-ink">Sent on WhatsApp</span>
              <span className="text-caption text-ink-muted">Amaka O. · 10:46</span>
            </span>
          </div>
        </Floating>
      </div>

      <div
        role="tablist"
        aria-label="What happens to a sample"
        className="grid grid-cols-4 gap-3"
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
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
