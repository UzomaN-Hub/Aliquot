"use client";

import { useState, type ComponentProps } from "react";

import { cn } from "@/lib/cn";

import { Button } from "./button";
import { controlClasses, useFieldControl, type ControlSize } from "./field";

type PasswordInputProps = Omit<ComponentProps<"input">, "size" | "type"> & { size?: ControlSize };

/**
 * Password with a "Show" text toggle (approved login design). The word, not an eye
 * icon: no decorative icons (DESIGN.md rule 6), and the word can't be misread.
 */
export function PasswordInput({
  size = "md",
  autoComplete = "current-password",
  className,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const { id, describedBy, invalid } = useFieldControl();

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        spellCheck={false}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        className={cn(controlClasses(invalid, size), "pr-16", className)}
        {...props}
      />
      <Button
        variant="link"
        size={size}
        aria-controls={id}
        // The visible word starts the spoken name (WCAG 2.5.3 "label in name").
        aria-label={visible ? "Hide password" : "Show password"}
        onClick={() => setVisible((shown) => !shown)}
        className="absolute inset-y-0 right-3 my-auto h-fit"
      >
        {visible ? "Hide" : "Show"}
      </Button>
      <span className="sr-only" aria-live="polite">
        {visible ? "Your password is shown." : ""}
      </span>
    </div>
  );
}
