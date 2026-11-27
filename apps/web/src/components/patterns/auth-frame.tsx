import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/ui/theme-toggle";

/**
 * The frame every sign-in style page shares (DESIGN.md rule 7a): a name large at the
 * top left, the theme control top right, one generous panel in the centre, the
 * platform credit at the foot. The blurred backdrop is placed by the page, outside
 * any Suspense, so it paints first.
 */
export function AuthFrame({
  wordmark,
  footer,
  children,
}: {
  wordmark: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <header className="flex items-start justify-between gap-6 px-6 pt-6 sm:px-10 sm:pt-8">
        <div className="max-w-[18ch] font-serif text-figure leading-none tracking-headline sm:text-display">
          {wordmark}
        </div>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div
          data-surface
          className="w-full max-w-[460px] rounded-panel border border-hairline bg-surface-raised px-7 py-12 shadow-overlay sm:px-12 sm:py-14"
        >
          {children}
        </div>
      </main>
      {footer && (
        <footer className="px-6 pb-6 text-center text-caption text-ink-muted sm:px-10">
          {footer}
        </footer>
      )}
    </>
  );
}
