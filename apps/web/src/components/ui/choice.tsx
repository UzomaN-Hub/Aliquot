"use client";

import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

import { controlClasses, useFieldControl, type ControlSize } from "./field";

/** A checkbox with its label beside it. Native input, so every browser and screen
 *  reader knows it; tinted with the main colour. */
export function Checkbox({
  label,
  hint,
  className,
  ...props
}: Omit<ComponentProps<"input">, "type"> & { label: string; hint?: string }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3 py-1", className)}>
      <input
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 cursor-pointer accent-primary"
        {...props}
      />
      <span className="flex flex-col">
        <span className="text-body">{label}</span>
        {hint && <span className="text-caption text-ink-muted">{hint}</span>}
      </span>
    </label>
  );
}

/** A native select inside a Field (keyboard, mobile pickers and screen readers for free). */
export function Select({
  size = "md",
  className,
  children,
  ...props
}: Omit<ComponentProps<"select">, "size"> & { size?: ControlSize }) {
  const { id, describedBy, invalid } = useFieldControl();
  return (
    <select
      id={id}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      className={cn(controlClasses(invalid, size), "cursor-pointer bg-surface-raised", className)}
      {...props}
    >
      {children}
    </select>
  );
}
