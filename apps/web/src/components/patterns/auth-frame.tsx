import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/cn";

import { ComingSoon } from "./coming-soon";

/**
 * The frame every sign-in style page shares (DESIGN.md rule 7a, decision 020).
 * Top: the name, large, with a "Secure sign-in" status and the theme control.
 * Centre: one wide card shaped like a request form: a strip naming who it's for and
 * what this page does, a perforated rule, the form, and a foot with help, privacy
 * and terms. Below it, the platform credit on lab pages. The blurred backdrop is
 * placed by the page, outside any Suspense, so it paints first.
 * Links to pages that don't exist yet open "Coming soon" (data-soon).
 */
export function AuthFrame({
  brand,
  cardLabel,
  tag,
  status = "Secure sign-in",
  help,
  credit,
  children,
}: {
  brand: ReactNode;
  /** The strip's left side, e.g. "Tavnit Labs · staff". */
  cardLabel: string;
  /** What this page does, in the strip's tag: "Sign in", "Set password", "Join". */
  tag: string;
  status?: string;
  /** The foot's left side: who to ask for help. */
  help: ReactNode;
  credit?: ReactNode;
  children: ReactNode;
}) {
  return (
    <ComingSoon>
      <header className="flex animate-fade items-center justify-between gap-6 px-6 pt-6 sm:px-12 sm:pt-8">
        <div className="max-w-[16ch] font-serif text-figure leading-none tracking-headline sm:text-wordmark">
          {brand}
        </div>
        <div className="flex items-center gap-4">
          <p
            data-surface
            className="hidden h-10 items-center gap-2.5 rounded-full border border-hairline bg-surface-raised px-4 font-mono text-caption tracking-label text-ink-secondary uppercase md:flex"
          >
            <span aria-hidden="true" className="size-2 animate-breathe rounded-full bg-primary" />
            {status}
          </p>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:py-14">
        <AuthCard cardLabel={cardLabel} tag={tag} help={help}>
          {children}
        </AuthCard>
      </main>

      {credit && (
        <footer className="animate-fade px-6 pb-6 text-center text-caption text-ink-muted [animation-delay:600ms] sm:px-10">
          {credit}
        </footer>
      )}
    </ComingSoon>
  );
}

/** The card alone, also used by loading skeletons so nothing moves when data lands. */
export function AuthCard({
  cardLabel,
  tag,
  help,
  children,
}: {
  cardLabel: ReactNode;
  tag: ReactNode;
  help: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      data-surface
      className="flex w-full max-w-[720px] animate-rise flex-col rounded-hero border border-hairline bg-surface-raised shadow-overlay"
    >
      <div className="flex h-16 items-center justify-between gap-4 border-b border-dashed border-ink-faint/50 px-7 sm:px-16">
        <p className="truncate font-mono text-caption tracking-label text-ink-muted uppercase">
          {cardLabel}
        </p>
        <p className="shrink-0 rounded-control bg-ink px-2 py-0.5 font-mono text-caption font-semibold tracking-label text-surface uppercase">
          {tag}
        </p>
      </div>
      <div className="flex flex-1 flex-col justify-center px-7 py-12 sm:min-h-[560px] sm:px-16 sm:py-16">
        {children}
      </div>
      <div className="mx-7 flex flex-col gap-3 border-t border-hairline py-6 text-body text-ink-muted sm:mx-16 sm:flex-row sm:items-center sm:justify-between">
        <p>{help}</p>
        <p className="flex items-center gap-3">
          <SoonLink
            soon="Privacy policy"
            text="Our privacy policy is being written with the rest of our launch documents. It will say what we keep, why, and for how long."
          >
            Privacy policy
          </SoonLink>
          <span aria-hidden="true">·</span>
          <SoonLink
            soon="Terms"
            text="Our terms of use arrive with the launch documents, very soon."
          >
            Terms
          </SoonLink>
        </p>
      </div>
    </div>
  );
}

/** A link-styled button for a page that doesn't exist yet: opens "Coming soon". */
export function SoonLink({
  soon,
  text,
  strong = false,
  children,
}: {
  soon: string;
  text: string;
  /** The page's main secondary link (Forgot your password?): bolder, Prussian rule. */
  strong?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      data-soon={soon}
      data-soon-text={text}
      className={cn(
        "cursor-pointer underline underline-offset-4 transition-colors hover:text-ink",
        strong
          ? "font-semibold text-ink decoration-primary decoration-2"
          : "decoration-ink-faint hover:decoration-ink",
      )}
    >
      {children}
    </button>
  );
}

/**
 * The page's headline: Instrument Serif, words rising out of a mask in turn, the
 * last part in Prussian and an Eosin full stop (Aliquot's signature, decision 020).
 * Screen readers hear one plain sentence.
 */
export function AuthTitle({ lead, accent }: { lead: string; accent: string }) {
  const words = [...lead.split(" "), ...accent.split(" ")];
  const leadCount = lead.split(" ").length;
  return (
    <h1 className="font-serif text-hero-sm font-normal tracking-headline text-balance sm:text-hero">
      {/* One plain sentence for screen readers; the animated words are for the eye. */}
      <span className="sr-only">{`${lead} ${accent}.`}</span>
      {words.map((word, i) => (
        <span key={i} aria-hidden="true">
          {i > 0 && " "}
          <span className="rise-mask">
            <span
              className={cn("rise-word", i >= leadCount && "text-primary")}
              style={{ "--i": i } as React.CSSProperties}
            >
              {word}
              {i === words.length - 1 && <span className="text-eosin">.</span>}
            </span>
          </span>
        </span>
      ))}
    </h1>
  );
}

/** The line under the headline. */
export function AuthLead({ children }: { children: ReactNode }) {
  return (
    <p className="mt-4 mb-10 animate-rise text-body-lg text-ink-secondary [animation-delay:250ms]">
      {children}
    </p>
  );
}

/** Below the form, after a perforated rule: one link and a quiet note. */
export function AuthNote({ children, note }: { children: ReactNode; note?: ReactNode }) {
  return (
    <div className="mt-8 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-dashed border-ink-faint/50 pt-6 text-body-lg">
      {children}
      {note && <span className="text-body text-ink-muted">{note}</span>}
    </div>
  );
}
