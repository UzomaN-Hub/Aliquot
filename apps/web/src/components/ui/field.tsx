"use client";

import { createContext, useContext, useId, type ComponentProps, type ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Field (DESIGN.md "Feedback & states" → Inline field).
 * Order, top to bottom: label · hint · control · error. The hint sits ABOVE the
 * control, so an error appearing below never pushes the hint around, and a screen
 * reader hears label → hint → control.
 * The form decides WHEN to pass `error` (on blur or submit, never while typing).
 */

type FieldContextValue = { id: string; describedBy: string | undefined; invalid: boolean };

const FieldContext = createContext<FieldContextValue | null>(null);

export function useFieldControl(): FieldContextValue {
  const context = useContext(FieldContext);
  if (!context) {
    throw new Error("Input, Textarea and PasswordInput must be placed inside a <Field>.");
  }
  return context;
}

type FieldProps = {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  /** Most clinical fields are required, so we mark the exceptions, not the rule. */
  optional?: boolean;
  className?: string;
  children: ReactNode;
};

export function Field({ label, hint, error, optional = false, className, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-body font-medium text-ink">
        {label}
        {optional && <span className="font-normal text-ink-muted"> (optional)</span>}
      </label>
      {hint && (
        <p id={hintId} className="text-caption text-ink-muted">
          {hint}
        </p>
      )}
      <FieldContext value={{ id, describedBy, invalid: Boolean(error) }}>{children}</FieldContext>
      {error && (
        <p id={errorId} className="flex gap-1.5 text-body text-eosin-text">
          <span aria-hidden="true" className="font-semibold">
            !
          </span>
          {/* aria-invalid on the control already tells screen readers it's an error. */}
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

export type ControlSize = "md" | "lg";

/**
 * Shared look of every text control. The resting border is ink-faint, not hairline:
 * a field's edge must reach 3:1 against Bone (WCAG 1.4.11), hairline is ~1.2:1.
 */
export function controlClasses(invalid: boolean, size: ControlSize): string {
  return cn(
    "w-full rounded-control border bg-transparent text-ink transition-colors",
    "placeholder:text-ink-muted hover:border-ink-muted focus-visible:border-ink",
    "read-only:border-hairline read-only:bg-hover",
    "disabled:cursor-not-allowed disabled:border-hairline disabled:text-ink-muted",
    invalid ? "border-eosin hover:border-eosin focus-visible:border-eosin" : "border-ink-faint",
    size === "md" ? "h-9 px-3 text-body" : "h-11 px-3.5 text-body-lg",
  );
}

type InputProps = Omit<ComponentProps<"input">, "size"> & {
  size?: ControlSize;
  /** Lab numbers, values, codes: Atkinson Mono with tabular figures. */
  mono?: boolean;
};

export function Input({ size = "md", mono = false, className, ...props }: InputProps) {
  const { id, describedBy, invalid } = useFieldControl();
  return (
    <input
      id={id}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      className={cn(controlClasses(invalid, size), mono && "font-mono", className)}
      {...props}
    />
  );
}

type TextareaProps = ComponentProps<"textarea"> & { size?: ControlSize };

export function Textarea({ size = "md", rows = 3, className, ...props }: TextareaProps) {
  const { id, describedBy, invalid } = useFieldControl();
  return (
    <textarea
      id={id}
      rows={rows}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      className={cn(controlClasses(invalid, size), "h-auto resize-y py-2", className)}
      {...props}
    />
  );
}
