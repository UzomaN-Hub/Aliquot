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

/**
 * Two looks (decision 020):
 * - `box`: the near-square box, for dense bench screens, search and multi-line text.
 * - `line`: one bold underline that a Prussian line draws across on focus, with a
 *   numbered mono label. For sign-in, set-password and short forms with room to breathe.
 */
export type FieldLook = "box" | "line";

type FieldContextValue = {
  id: string;
  describedBy: string | undefined;
  invalid: boolean;
  look: FieldLook;
};

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
  look?: FieldLook;
  /** Line fields only: the field's number in the form ("01"), read by eye, not aloud. */
  index?: number;
  className?: string;
  children: ReactNode;
};

export function Field({
  label,
  hint,
  error,
  optional = false,
  look = "box",
  index,
  className,
  children,
}: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div
      className={cn("group/field flex flex-col", look === "line" ? "gap-1" : "gap-1.5", className)}
    >
      {look === "line" ? (
        // The number sits beside the label, not in it, so the field's name stays
        // exactly its label ("Email", not "01 Email").
        <div className="flex items-baseline gap-2.5 font-mono text-caption font-medium tracking-label text-ink-muted uppercase transition-colors group-focus-within/field:text-ink">
          {index !== undefined && (
            <span aria-hidden="true" className="font-semibold text-primary">
              {String(index).padStart(2, "0")}
            </span>
          )}
          <label htmlFor={id}>
            {label}
            {optional && <span className="normal-case"> (optional)</span>}
          </label>
        </div>
      ) : (
        <label htmlFor={id} className="text-body font-medium text-ink">
          {label}
          {optional && <span className="font-normal text-ink-muted"> (optional)</span>}
        </label>
      )}
      {hint && (
        <p id={hintId} className="text-caption text-ink-muted">
          {hint}
        </p>
      )}
      <FieldContext value={{ id, describedBy, invalid: Boolean(error), look }}>
        {children}
      </FieldContext>
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
export function controlClasses(
  invalid: boolean,
  size: ControlSize,
  look: FieldLook = "box",
): string {
  if (look === "line") {
    // No box: a 2px underline at rest (ink-faint, 3:1), darker on hover, Eosin when
    // invalid. Focus is the drawn Prussian line (`.field-line`), so no outline ring.
    return cn(
      "w-full rounded-none border-0 border-b-2 bg-transparent px-0 text-ink transition-colors",
      "font-medium placeholder:font-normal placeholder:text-ink-muted hover:border-ink-muted focus-visible:outline-none",
      "read-only:border-hairline disabled:cursor-not-allowed disabled:border-hairline disabled:text-ink-muted",
      invalid ? "border-eosin hover:border-eosin" : "border-ink-faint",
      size === "md" ? "h-10 text-body-lg" : "h-12 text-title",
    );
  }
  return cn(
    "w-full rounded-control border bg-transparent text-ink transition-colors",
    "placeholder:text-ink-muted hover:border-ink-muted focus-visible:border-primary",
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
  const { id, describedBy, invalid, look } = useFieldControl();
  const input = (
    <input
      id={id}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      className={cn(controlClasses(invalid, size, look), mono && "font-mono", className)}
      {...props}
    />
  );
  return look === "line" ? <LineFrame invalid={invalid}>{input}</LineFrame> : input;
}

/** Holds the line that draws across a line field on focus (globals.css `.field-line`). */
export function LineFrame({ invalid, children }: { invalid: boolean; children: ReactNode }) {
  return (
    <span className="field-line" data-invalid={invalid || undefined}>
      {children}
    </span>
  );
}

type TextareaProps = ComponentProps<"textarea"> & { size?: ControlSize };

/** Always boxed: several lines of text need the box to show where they go. */
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
