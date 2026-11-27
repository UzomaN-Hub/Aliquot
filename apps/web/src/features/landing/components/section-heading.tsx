import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * A landing section's opening (decision 018):
 * - a header row: square, number, a label that decodes itself (data-scramble), a
 *   short tagline on the right, a hairline below;
 * - a two-tone headline whose letters drop in, every time you arrive (data-drop);
 * - an intro whose lines rise (data-split="words").
 */
export function SectionHeading({
  id,
  index,
  label,
  tagline,
  title,
  accent,
  intro,
  className,
}: {
  id: string;
  index: string;
  label: string;
  tagline?: string;
  title: string;
  accent?: string;
  intro?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-10", className)}>
      <div className="flex items-center justify-between gap-6 border-b border-hairline pb-5 font-mono text-body uppercase">
        <p className="flex items-center gap-3">
          <span aria-hidden="true" className="size-2 bg-eosin" />
          <span className="text-primary">{index}</span>
          <span data-scramble className="text-ink">
            {label}
          </span>
        </p>
        {tagline && <p className="hidden text-right text-ink-muted sm:block">{tagline}</p>}
      </div>
      <h2 id={id} data-reveal data-drop className="font-serif text-headline tracking-headline">
        <span className="block">{title}</span>
        {accent && " "}
        {accent && <span className="block text-primary">{accent}</span>}
      </h2>
      {intro && (
        <p data-reveal data-split="words" className="max-w-[60ch] text-lead text-ink-secondary">
          {intro}
        </p>
      )}
    </div>
  );
}
