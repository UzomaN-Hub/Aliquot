import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * The landing's big action pill: label + arrow in a circle. Ink at rest, Prussian on
 * hover (on light pages), the arrow nudging up and right. `tone="light"` for use on
 * Prussian or graphite blocks. Extra props (href, data-soon…) pass to the <a>.
 */
export function CtaPill({
  children,
  tone = "ink",
  size = "lg",
  className,
  ...props
}: {
  children: ReactNode;
  tone?: "ink" | "light";
  size?: "md" | "lg";
  className?: string;
} & React.ComponentProps<"a">) {
  return (
    <a
      className={cn(
        "group inline-flex cursor-pointer items-center gap-4 rounded-full font-medium transition-colors duration-300",
        size === "lg" ? "h-16 pr-2 pl-8 text-lead" : "h-13 pr-1.5 pl-6 text-body-lg",
        tone === "ink"
          ? "bg-ink text-surface hover:bg-primary"
          : "bg-surface text-ink hover:bg-ink hover:text-surface",
        className,
      )}
      {...props}
    >
      {children}
      <span
        aria-hidden="true"
        className={cn(
          "grid place-items-center rounded-full transition-colors duration-300",
          size === "lg" ? "size-12 text-title" : "size-10 text-body-lg",
          tone === "ink" ? "bg-surface/15" : "bg-ink/10 group-hover:bg-surface/15",
        )}
      >
        <span className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
          ↗
        </span>
      </span>
    </a>
  );
}
