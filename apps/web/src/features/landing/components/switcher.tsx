"use client";

import { useId, useState } from "react";

import { cn } from "@/lib/cn";

export type SwitcherItem = { name: string; title: string; body: string; points: string[] };

/**
 * Big outlined words on the left; the active one fills in and its story appears on
 * the right. Hover with a mouse, tap on touch, arrow keys or Tab on a keyboard
 * (ARIA tabs). The outline is the type itself (text-stroke), no images.
 */
export function Switcher({ items, label }: { items: SwitcherItem[]; label: string }) {
  const [active, setActive] = useState(0);
  const base = useId();
  const current = items[active] ?? items[0];
  if (!current) return null;

  const move = (step: number) => {
    const next = (active + step + items.length) % items.length;
    setActive(next);
    document.getElementById(`${base}-tab-${next}`)?.focus();
  };

  return (
    <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
      <div role="tablist" aria-label={label} aria-orientation="vertical" className="flex flex-col">
        {items.map((item, i) => {
          const selected = i === active;
          return (
            <button
              key={item.name}
              id={`${base}-tab-${i}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${base}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(i)}
              onPointerEnter={(event) => event.pointerType === "mouse" && setActive(i)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" || event.key === "ArrowRight") {
                  event.preventDefault();
                  move(1);
                } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
                  event.preventDefault();
                  move(-1);
                }
              }}
              data-reveal="fade"
              className="group flex cursor-pointer items-baseline gap-6 border-t border-hairline py-5 text-left last:border-b"
            >
              <span className="font-mono text-body text-primary">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                className={cn(
                  "font-serif text-[clamp(2.6rem,1.4rem+4.6vw,5.75rem)] leading-none tracking-headline transition-colors duration-300",
                  selected ? "text-ink" : "text-outline",
                )}
              >
                {item.name}
              </span>
            </button>
          );
        })}
      </div>

      <div
        id={`${base}-panel`}
        role="tabpanel"
        aria-labelledby={`${base}-tab-${active}`}
        className="flex flex-col justify-center gap-6"
      >
        <div key={current.name} className="switcher-panel flex flex-col gap-6">
          <p className="font-mono text-body text-primary uppercase">For {current.name}</p>
          <h3 className="font-serif text-[clamp(2rem,1.4rem+2vw,3.25rem)] leading-tight tracking-headline">
            {current.title}
          </h3>
          <p className="max-w-[48ch] text-lead text-ink-secondary">{current.body}</p>
          <ul className="flex flex-col gap-3">
            {current.points.map((point) => (
              <li key={point} className="flex items-baseline gap-3 text-body-lg">
                <span aria-hidden="true" className="text-primary">
                  ✓
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
