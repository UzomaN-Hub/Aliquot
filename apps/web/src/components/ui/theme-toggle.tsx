"use client";

import { cn } from "@/lib/cn";
import type { ThemePreference } from "@/lib/theme/theme";
import { useThemeStore } from "@/stores/theme";

const options: { value: ThemePreference; label: string; hint: string }[] = [
  { value: "auto", label: "Auto", hint: "Light from 08:00, dark from 19:00" },
  { value: "light", label: "Light", hint: "Always light" },
  { value: "dark", label: "Dark", hint: "Always dark" },
];

/**
 * Theme control: a three-part segmented switch with words, not sun/moon icons.
 * Radio semantics: arrow keys move between options, the choice is announced.
 * `tone="bar"` sits on the Prussian top bar; `tone="page"` on Bone/graphite.
 */
export function ThemeToggle({
  tone = "page",
  className,
}: {
  tone?: "page" | "bar";
  className?: string;
}) {
  const preference = useThemeStore((state) => state.preference);
  const setPreference = useThemeStore((state) => state.setPreference);

  function onKeyDown(event: React.KeyboardEvent, index: number) {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = options[(index + step + options.length) % options.length]!; // index stays in range
    setPreference(next.value);
    const group = event.currentTarget.parentElement;
    (group?.querySelector(`[data-value="${next.value}"]`) as HTMLElement | null)?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={cn(
        "inline-flex rounded-control border p-0.5 text-caption",
        tone === "bar" ? "border-on-bar-muted/40" : "border-hairline bg-surface-raised",
        className,
      )}
    >
      {options.map((option, index) => {
        const checked = preference === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            data-value={option.value}
            title={option.hint}
            tabIndex={checked ? 0 : -1}
            onClick={() => setPreference(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              "min-w-12 cursor-pointer rounded-[1px] px-2.5 py-1 font-medium transition-colors",
              tone === "bar"
                ? checked
                  ? "bg-on-bar text-bar"
                  : "text-on-bar-muted hover:text-on-bar"
                : checked
                  ? "bg-primary text-on-primary"
                  : "text-ink-muted hover:text-ink",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
