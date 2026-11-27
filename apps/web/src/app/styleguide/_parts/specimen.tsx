import type { ReactNode } from "react";

/** One styleguide section: title, one line on when to use it, then the specimens. */
export function Section({
  id,
  title,
  intro,
  children,
}: {
  id: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4 border-t border-hairline pt-10">
      <div className="flex max-w-2xl flex-col gap-1">
        <h2 id={id} className="text-title font-medium">
          {title}
        </h2>
        <p className="text-body text-ink-secondary">{intro}</p>
      </div>
      {children}
    </section>
  );
}

/**
 * Renders the same specimens in light and dark side by side. The tokens flip per
 * pane through data-theme (tokens.css), exactly as they do for a real user.
 */
export function ThemePair({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-px overflow-hidden rounded-panel border border-hairline bg-hairline lg:grid-cols-2">
      <div data-theme="light" className="flex flex-col gap-8 bg-surface p-8 text-ink">
        <p className="text-caption text-ink-muted">Light</p>
        {children}
      </div>
      <div data-tone="dark" className="flex flex-col gap-8 bg-surface p-8 text-ink">
        <p className="text-caption text-ink-muted">Dark</p>
        {children}
      </div>
    </div>
  );
}

/** One state of a component, with a small muted label above it. */
export function Specimen({
  label,
  note,
  children,
}: {
  label: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-caption text-ink-muted">
        {label}
        {note && <span className="text-ink-secondary"> · {note}</span>}
      </p>
      <div className="flex flex-wrap items-center gap-6">{children}</div>
    </div>
  );
}
