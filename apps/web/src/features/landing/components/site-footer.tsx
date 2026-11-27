import { ThemeToggle } from "@/components/ui/theme-toggle";

import { MotionToggle } from "./motion-toggle";

export function SiteFooter({ name }: { name: string }) {
  return (
    <footer className="px-6 pt-20 pb-10 sm:px-10">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-16">
        <div className="flex flex-col justify-between gap-10 lg:flex-row lg:items-end">
          <p className="font-serif text-[clamp(4rem,2rem+10vw,11rem)] leading-[0.85] tracking-headline">
            {name}
            <span className="text-eosin">.</span>
          </p>
          <ul className="grid grid-cols-2 gap-x-12 gap-y-3 text-body-lg">
            <li>
              <a href="#journey" className="text-ink-secondary hover:text-ink">
                How it works
              </a>
            </li>
            <li>
              <a href="#disciplines" className="text-ink-secondary hover:text-ink">
                Sections
              </a>
            </li>
            <li>
              <a href="#safety" className="text-ink-secondary hover:text-ink">
                Safety
              </a>
            </li>
            <li>
              <a href="#questions" className="text-ink-secondary hover:text-ink">
                Questions
              </a>
            </li>
          </ul>
        </div>
        <div className="flex flex-col gap-6 border-t border-hairline pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-body text-ink-muted">
            Lab staff sign in from their own lab&apos;s address. © {name}.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <MotionToggle />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </footer>
  );
}
