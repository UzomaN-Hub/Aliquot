"use client";

import { useId, useState } from "react";

import { cn } from "@/lib/cn";

export type AccordionItem = { title: string; body: string; meta?: string };

/**
 * An accordion that opens on hover with a mouse, on tap with touch, and on focus or
 * Enter/Space with a keyboard. Each header is a real button with aria-expanded, so
 * screen readers and keyboards get the same content. Height animates through CSS grid
 * rows (globals.css .accordion-panel), so nothing is measured in JavaScript.
 */
export function HoverAccordion({
  items,
  initial = 0,
}: {
  items: AccordionItem[];
  initial?: number;
}) {
  const [open, setOpen] = useState<number | null>(initial);
  const base = useId();

  const hoverCapable = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  return (
    <ul className="flex flex-col border-b border-hairline">
      {items.map((item, i) => {
        const isOpen = open === i;
        const panelId = `${base}-panel-${i}`;
        return (
          <li
            key={item.title}
            data-reveal="fade"
            className="border-t border-hairline"
            onPointerEnter={(event) => {
              if (event.pointerType === "mouse" && hoverCapable()) setOpen(i);
            }}
          >
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpen(isOpen && !hoverCapable() ? null : i)}
              // Keyboard focus opens; a tap's own focus must not, or the tap's click
              // would immediately toggle the item shut again.
              onFocus={(event) => {
                if (event.currentTarget.matches(":focus-visible")) setOpen(i);
              }}
              className="group flex w-full cursor-pointer items-baseline justify-between gap-6 py-6 text-left"
            >
              <span className="flex items-baseline gap-6">
                <span className="font-mono text-body text-ink-muted">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className={cn(
                    "font-serif text-[clamp(1.6rem,1.2rem+1.6vw,2.5rem)] leading-tight tracking-headline transition-colors duration-300",
                    isOpen ? "text-ink" : "text-ink-secondary group-hover:text-ink",
                  )}
                >
                  {item.title}
                </span>
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "font-mono text-title text-ink-muted transition-transform duration-300",
                  isOpen && "rotate-45 text-primary",
                )}
              >
                +
              </span>
            </button>
            <div id={panelId} role="region" className="accordion-panel" data-open={isOpen}>
              <div>
                <div className="flex max-w-[64ch] flex-col gap-2 pb-8 pl-[calc(2ch+1.5rem)]">
                  <p className="text-body-lg text-ink-secondary">{item.body}</p>
                  {item.meta && <p className="font-mono text-body text-ink-muted">{item.meta}</p>}
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
