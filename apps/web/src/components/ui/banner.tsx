import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Banner (DESIGN.md "Feedback & states"): an ONGOING condition (offline, session
 * expiring, TAT breach, lab suspended, unacknowledged criticals). It stays until the
 * condition clears, so there is no close button.
 *
 * Not the usual rounded tinted box with an icon: a full-width strip ruled top and
 * bottom like a line in a lab ledger. Severity escalates without new colours.
 */
export type BannerSeverity = "critical" | "warning" | "success" | "info";

const severities: Record<BannerSeverity, { glyph: string; word?: string; strip: string }> = {
  critical: { glyph: "!", strip: "border-y border-eosin text-eosin-text" },
  warning: {
    glyph: "!",
    word: "Warning",
    strip: "border-y border-transparent bg-selected text-ink",
  },
  success: { glyph: "✓", strip: "border-y border-hairline text-ink" },
  info: { glyph: "", strip: "border-y border-hairline text-ink-muted" },
};

type BannerProps = {
  severity: BannerSeverity;
  children: ReactNode;
  /** One text-link action, e.g. "Reconnect" or "Review 3 alerts". */
  action?: ReactNode;
  className?: string;
};

export function Banner({ severity, children, action, className }: BannerProps) {
  const { glyph, word, strip } = severities[severity];

  return (
    <div
      // Critical interrupts the screen reader; the rest wait their turn.
      role={severity === "critical" ? "alert" : "status"}
      className={cn("flex items-baseline gap-3 px-4 py-2.5 text-body", strip, className)}
    >
      {glyph && (
        <span aria-hidden="true" className="w-3 shrink-0 font-mono font-semibold">
          {glyph}
        </span>
      )}
      <p className="min-w-0 flex-1">
        {word && <span className="font-semibold">{word}. </span>}
        {children}
      </p>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
