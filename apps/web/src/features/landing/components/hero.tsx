import { Fragment, type CSSProperties } from "react";

import { Button } from "@/components/ui/button";

import { AliquotFigure } from "./aliquot-figure";

const HEADLINE = "Every sample, accounted for";

/**
 * Hero (ANIMATION.md, decision 017): the whole first screen. The headline rises word
 * by word and ends with Aliquot's Eosin full stop. Its motion is plain CSS that starts
 * on the first frame (it's the largest thing on screen, so it must never wait for
 * JavaScript). Beside it, the aliquot figure (GSAP) builds stacks of verified results.
 */
export function Hero({ demoHref }: { demoHref: string }) {
  const words = HEADLINE.split(" ");

  return (
    <section
      aria-labelledby="hero-title"
      className="relative flex min-h-dvh flex-col justify-center px-6 pt-28 pb-16 sm:px-10 lg:pt-24"
    >
      <div className="mx-auto grid w-full max-w-[1440px] items-center gap-14 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10">
        <div className="flex flex-col gap-8">
          <p
            className="hero-fade max-w-[46ch] text-body-lg text-ink-secondary"
            style={{ "--d": "200ms" } as CSSProperties}
          >
            Laboratory information system for Chemical Pathology, Haematology and Medical
            Microbiology.
          </p>
          <h1 id="hero-title" className="font-serif text-mega tracking-headline text-balance">
            {words.map((word, i) => (
              // The space sits BETWEEN the masks: inside an inline-block, a trailing
              // space is dropped and the words would run together.
              <Fragment key={`${i}-${word}`}>
                <span className="hero-mask">
                  <span className="hero-word" style={{ "--i": i } as CSSProperties}>
                    {word}
                    {i === words.length - 1 && <span className="hero-dot text-eosin">.</span>}
                  </span>
                </span>
                {i < words.length - 1 && " "}
              </Fragment>
            ))}
          </h1>
          <p
            className="hero-fade max-w-[52ch] text-body-lg text-ink-secondary sm:text-[19px] sm:leading-[30px]"
            style={{ "--d": "650ms" } as CSSProperties}
          >
            From the front desk to the verified result: one calm system for the whole lab, with
            every value, flag and signature on record.
          </p>
          <div
            className="hero-fade flex flex-wrap items-center gap-x-8 gap-y-4"
            style={{ "--d": "800ms" } as CSSProperties}
          >
            <Button variant="marketing" asChild>
              <a href={demoHref}>Book a demo</a>
            </Button>
            <Button variant="link" size="lg" asChild>
              <a href="#journey">See how it works</a>
            </Button>
          </div>
        </div>

        <div
          data-hero-figure
          data-reveal
          className="mx-auto w-full max-w-[380px] sm:max-w-[440px] lg:max-w-[520px]"
        >
          <AliquotFigure />
        </div>
      </div>

      <a
        href="#problem"
        className="hero-fade mx-auto mt-14 flex flex-col items-center gap-3 text-caption text-ink-muted hover:text-ink lg:absolute lg:bottom-8 lg:left-1/2 lg:mt-0 lg:-translate-x-1/2"
        style={{ "--d": "1200ms" } as CSSProperties}
      >
        Scroll
        <span aria-hidden="true" className="relative h-10 w-px overflow-hidden bg-hairline">
          <span className="scroll-cue absolute inset-x-0 top-0 h-1/2 bg-ink" />
        </span>
      </a>
    </section>
  );
}
