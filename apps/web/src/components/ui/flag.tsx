import { cn } from "@/lib/cn";

/** Result flags (SCHEMA.md results.flag). The server's flag is final; this only displays it. */
export type ResultFlag = "N" | "H" | "L" | "CH" | "CL" | "ABN";

const flags: Record<
  Exclude<ResultFlag, "N">,
  { letters: string; arrow: string; spoken: string; className: string }
> = {
  H: { letters: "H", arrow: "↑", spoken: "High", className: "font-semibold text-ink" },
  L: { letters: "L", arrow: "↓", spoken: "Low", className: "font-semibold text-ink" },
  CH: {
    letters: "CH",
    arrow: "↑",
    spoken: "Critical high",
    className: "font-semibold text-eosin-text",
  },
  CL: {
    letters: "CL",
    arrow: "↓",
    spoken: "Critical low",
    className: "font-semibold text-eosin-text",
  },
  ABN: { letters: "ABN", arrow: "", spoken: "Abnormal", className: "font-semibold text-ink" },
};

/**
 * Flag (DESIGN.md: "Flags never rely on colour alone").
 * Letters always show; colour and arrow only add to them. Plain text, never a chip.
 * Normal ("N") renders nothing: the absence of a flag is the signal.
 */
export function Flag({ flag, className }: { flag: ResultFlag; className?: string }) {
  if (flag === "N") return null;
  const { letters, arrow, spoken, className: tone } = flags[flag];

  return (
    <span className={cn("inline-flex items-baseline gap-0.5 font-mono", tone, className)}>
      <span aria-hidden="true">
        {letters}
        {arrow}
      </span>
      <span className="sr-only">{spoken}</span>
    </span>
  );
}
