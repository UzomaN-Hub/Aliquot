import { cn } from "@/lib/cn";

/**
 * The platform's mark (decision 020): a tube with a drop of Eosin falling into it.
 * An aliquot is a measured portion taken from a sample; the mark is that moment.
 * Sized in `em`, so it follows the wordmark's font size. On arrival the drop falls
 * and the level rises a little; hovering the wordmark makes the drop bob.
 */
export function AliquotMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 28 40"
      aria-hidden="true"
      focusable="false"
      className={cn("h-[0.92em] w-auto shrink-0 overflow-visible", className)}
    >
      <path
        className="mark-drop fill-eosin"
        d="M14 1C12.5 3.6 10.6 5.6 10.6 7.6a3.4 3.4 0 0 0 6.8 0C17.4 5.6 15.5 3.6 14 1Z"
      />
      <path
        d="M5.5 13v17a8.5 8.5 0 0 0 17 0V13"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path className="mark-level" d="M9.5 22h9v8a4.5 4.5 0 0 1-9 0Z" fill="currentColor" />
    </svg>
  );
}

/**
 * The platform's name with its mark, used wherever the platform introduces itself:
 * landing nav and footer, console sign-in, the console top bar. The name comes from
 * config (`PLATFORM_NAME`), never hard-coded. Set the size with a text class on it.
 */
export function Wordmark({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        "group inline-flex items-center gap-[0.22em] font-serif leading-none tracking-headline",
        className,
      )}
    >
      <AliquotMark className="-translate-y-[0.04em]" />
      <span>{name}</span>
    </span>
  );
}
