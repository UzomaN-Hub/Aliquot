import { Fragment, type CSSProperties } from "react";

import { CtaPill } from "./cta-pill";
import { HeroShowcase } from "./hero-showcase";

const LINE_ONE = ["Every", "sample,"];
const LINE_TWO = ["accounted", "for"];

function Words({ words, offset, last }: { words: string[]; offset: number; last?: boolean }) {
  return words.map((word, i) => (
    // The space sits BETWEEN the masks: inside an inline-block a trailing space is dropped.
    <Fragment key={word}>
      <span className="hero-mask">
        <span className="hero-word" style={{ "--i": offset + i } as CSSProperties}>
          {word}
          {last && i === words.length - 1 && <span className="hero-dot text-eosin">.</span>}
        </span>
      </span>
      {i < words.length - 1 && " "}
    </Fragment>
  ));
}

/**
 * Hero (decisions 017, 018): the whole first screen. Two-tone headline rising word by
 * word in plain CSS (it's the largest paint, so it never waits for a script), the
 * action pill, a figure that proves the scope, and the aliquot showcase beside it.
 */
export function Hero({ demoProps }: { demoProps: React.ComponentProps<"a"> }) {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative flex min-h-dvh flex-col justify-center px-6 pt-32 pb-16 sm:px-12 lg:pt-28"
    >
      <div className="mx-auto grid w-full max-w-[1520px] items-center gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        <div className="flex flex-col gap-9">
          <p
            className="hero-fade flex items-center gap-3 font-mono text-body text-ink-secondary uppercase"
            style={{ "--d": "150ms" } as CSSProperties}
          >
            <span aria-hidden="true" className="size-2 bg-eosin" />
            The laboratory information system
          </p>
          <h1 id="hero-title" className="font-serif text-mega tracking-headline">
            <span className="block">
              <Words words={LINE_ONE} offset={0} />
            </span>{" "}
            <span className="block text-primary">
              <Words words={LINE_TWO} offset={2} last />
            </span>
          </h1>
          <p
            className="hero-fade max-w-[46ch] text-lead text-ink-secondary"
            style={{ "--d": "650ms" } as CSSProperties}
          >
            From the front desk to the verified result: one calm system for Chemical Pathology,
            Haematology and Microbiology, with every value, flag and signature on record.
          </p>
          <div
            className="hero-fade flex flex-wrap items-center gap-x-8 gap-y-5"
            style={{ "--d": "800ms" } as CSSProperties}
          >
            <CtaPill {...demoProps}>Book a demo</CtaPill>
            <a
              href="#journey"
              className="text-lead underline decoration-ink-faint underline-offset-6 hover:decoration-ink"
            >
              See how it works
            </a>
          </div>
          <div
            className="hero-fade mt-4 flex items-center gap-8 border-t border-hairline pt-8"
            style={{ "--d": "1000ms" } as CSSProperties}
          >
            <p className="flex flex-col">
              <span className="font-serif text-[clamp(3rem,2rem+3vw,4.5rem)] leading-none tracking-headline">
                3
              </span>
              <span className="font-mono text-caption text-ink-muted uppercase">sections</span>
            </p>
            <p className="max-w-[28ch] border-l border-hairline pl-8 text-body-lg text-ink-secondary">
              One lab, one record. Every handover visible, every release signed.
            </p>
          </div>
        </div>

        <HeroShowcase />
      </div>
    </section>
  );
}
