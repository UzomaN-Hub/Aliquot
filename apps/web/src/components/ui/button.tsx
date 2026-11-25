"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps, MouseEvent, ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Button (DESIGN.md rules 1–2, decision 009).
 * - primary: the ONE filled action per screen. 2px corners.
 * - link: every secondary action. Underlined text, never a second box.
 * - marketing: landing pill (revisited at the landing stage).
 * No spinner: a pending button keeps its width and says what it is doing.
 */
const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center whitespace-nowrap transition-colors select-none",
  {
    variants: {
      variant: {
        primary:
          "rounded-control bg-primary font-medium text-on-primary hover:bg-primary/90 disabled:cursor-not-allowed disabled:border disabled:border-hairline disabled:bg-surface disabled:text-ink-muted",
        link: "rounded-control text-ink underline decoration-ink-faint decoration-1 underline-offset-4 hover:decoration-ink disabled:cursor-not-allowed disabled:text-ink-muted disabled:no-underline",
        marketing:
          "rounded-full bg-primary font-medium text-on-primary hover:bg-primary/90 disabled:cursor-not-allowed",
      },
      size: {
        md: "",
        lg: "",
      },
    },
    compoundVariants: [
      // Bench density (36px); public and front-desk touch targets (44px, FRONTEND.md §14).
      { variant: "primary", size: "md", className: "h-9 px-4 text-body" },
      { variant: "primary", size: "lg", className: "h-11 px-5 text-body-lg" },
      { variant: "link", size: "md", className: "text-body" },
      { variant: "link", size: "lg", className: "min-h-11 text-body-lg" },
      { variant: "marketing", className: "h-12 px-7 text-body-lg" },
    ],
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Render the child element (e.g. a Next.js Link) with button styling instead of a <button>. */
    asChild?: boolean;
    /** True while the action runs: blocks repeat clicks, announces busy, shows pendingLabel. */
    pending?: boolean;
    /** Verb in progress, e.g. "Saving…". Required with pending so the label never goes blank. */
    pendingLabel?: ReactNode;
  };

export function Button({
  variant,
  size,
  asChild = false,
  pending = false,
  pendingLabel,
  className,
  type = "button",
  onClick,
  children,
  ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size }), pending && "cursor-progress", className);

  if (asChild) {
    return (
      <Slot.Root className={classes} {...props}>
        {children}
      </Slot.Root>
    );
  }

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    // Not `disabled`: the button keeps focus and stays readable while busy.
    if (pending) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  }

  return (
    <button
      type={type}
      className={classes}
      aria-busy={pending || undefined}
      aria-disabled={pending || undefined}
      onClick={handleClick}
      {...props}
    >
      {pendingLabel === undefined ? (
        children
      ) : (
        // Both labels share one grid cell, so the button is as wide as the longer one
        // and never jumps when it switches to "Saving…".
        <span className="grid">
          <span
            className={cn("col-start-1 row-start-1", pending && "invisible")}
            aria-hidden={pending || undefined}
          >
            {children}
          </span>
          <span
            className={cn("col-start-1 row-start-1", !pending && "invisible")}
            aria-hidden={!pending || undefined}
          >
            {pendingLabel}
          </span>
        </span>
      )}
    </button>
  );
}
