import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * A landing section's opening: its number (navigational, mono) and a headline whose
 * letters arrive one by one (data-split="chars"), then an intro whose words follow.
 */
export function SectionHeading({
  id,
  index,
  title,
  intro,
  className,
}: {
  id: string;
  index: string;
  title: string;
  intro?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <p className="font-mono text-body text-ink-muted" data-reveal="fade">
        {index}
      </p>
      <h2
        id={id}
        data-reveal
        data-split="chars"
        className="max-w-[18ch] font-serif text-headline tracking-headline text-balance"
      >
        {title}
      </h2>
      {intro && (
        <p
          data-reveal
          data-split="words"
          className="max-w-[58ch] text-body-lg text-ink-secondary sm:text-[19px] sm:leading-[30px]"
        >
          {intro}
        </p>
      )}
    </div>
  );
}
