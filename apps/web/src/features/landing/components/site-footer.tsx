import { Wordmark } from "@/components/patterns/wordmark";
import { ThemeToggle } from "@/components/ui/theme-toggle";

import { MotionToggle } from "./motion-toggle";

type Link = { label: string; href?: string; soon?: string };

const COLUMNS: { title: string; links: Link[] }[] = [
  {
    title: "Explore",
    links: [
      { label: "How it works", href: "#journey" },
      { label: "The sections", href: "#disciplines" },
      { label: "Critical alerts", href: "#critical" },
      { label: "Result delivery", href: "#delivery" },
      { label: "Safety", href: "#safety" },
    ],
  },
  {
    title: "For labs",
    links: [
      { label: "Roles", href: "#people" },
      { label: "Pricing", soon: "Pricing" },
      { label: "Find your lab", soon: "Find your lab" },
      { label: "Onboarding guide", soon: "The onboarding guide" },
    ],
  },
  {
    title: "Go deeper",
    links: [
      { label: "Questions", href: "#questions" },
      { label: "What's next", href: "#next" },
      { label: "Security overview", soon: "The security overview" },
      { label: "System status", soon: "The status page" },
      { label: "Changelog", soon: "The changelog" },
    ],
  },
];

function FooterLink({ link }: { link: Link }) {
  return (
    <a
      href={link.href ?? "#top"}
      data-soon={link.soon}
      className="text-lead text-ink-secondary transition-colors hover:text-ink"
    >
      {link.label}
    </a>
  );
}

/** Always graphite (data-tone), like a closing page: columns, a next step, the name. */
export function SiteFooter({
  name,
  demoProps,
}: {
  name: string;
  demoProps: React.ComponentProps<"a">;
}) {
  return (
    <footer
      data-tone="dark"
      data-nav-tone="dark"
      className="overflow-hidden bg-surface px-6 pt-24 pb-28 text-ink sm:px-12 lg:pb-12"
    >
      <div className="mx-auto flex max-w-[1520px] flex-col gap-20">
        <div className="flex flex-col justify-between gap-8 border-b border-hairline pb-10 sm:flex-row sm:items-center">
          <p>
            <Wordmark name={name} className="text-wordmark" />
          </p>
          <p className="font-mono text-body text-ink-muted uppercase">
            Every sample, accounted for.
          </p>
          <a
            href="#top"
            className="text-body-lg underline decoration-ink-faint underline-offset-6 hover:decoration-ink"
          >
            Back to top ↑
          </a>
        </div>

        <div className="grid gap-14 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.3fr]">
          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title} className="flex flex-col gap-5">
              <p className="font-mono text-body text-ink-muted uppercase">{column.title}</p>
              <ul className="flex flex-col gap-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <FooterLink link={link} />
                  </li>
                ))}
              </ul>
            </nav>
          ))}
          <div className="flex flex-col gap-5">
            <p className="font-mono text-body text-ink-muted uppercase">Your next step</p>
            <a
              {...demoProps}
              className="group flex items-start gap-4 font-serif text-[clamp(2.4rem,1.8rem+2vw,3.6rem)] leading-[0.95] tracking-headline"
            >
              Bring your lab in.
              <span
                aria-hidden="true"
                className="text-eosin transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
              >
                ↗
              </span>
            </a>
          </div>
        </div>

        <p
          aria-hidden="true"
          className="-mb-4 text-center font-serif text-[clamp(6rem,1rem+22vw,24rem)] leading-[0.8] tracking-headline select-none"
        >
          {name}
          <span className="text-eosin">.</span>
        </p>

        <div className="flex flex-col gap-6 border-t border-hairline pt-8 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-body-lg text-ink-muted">
            © {name}. Lab staff sign in from their own lab&apos;s address.
          </p>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            <a
              href="#top"
              data-soon="The privacy notice"
              className="text-body-lg text-ink-muted hover:text-ink"
            >
              Privacy
            </a>
            <a
              href="#top"
              data-soon="The terms of service"
              className="text-body-lg text-ink-muted hover:text-ink"
            >
              Terms
            </a>
            <MotionToggle />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </footer>
  );
}
