import { StainBackdrop } from "@/components/patterns/stain-backdrop";
import { Button } from "@/components/ui/button";

/** The last word: graphite, the drifting blood film behind, one action. */
export function Closing({ demoHref, contactEmail }: { demoHref: string; contactEmail?: string }) {
  return (
    <section
      id="contact"
      aria-labelledby="contact-title"
      className="scroll-mt-24 px-3 pb-3 sm:px-6 sm:pb-6"
    >
      <div
        data-theme="dark"
        className="relative isolate overflow-hidden rounded-hero bg-surface px-6 py-32 text-ink sm:px-10 lg:py-48"
      >
        <StainBackdrop />
        <div className="relative mx-auto flex max-w-[1200px] flex-col items-start gap-10">
          <h2
            id="contact-title"
            data-reveal
            data-split="chars"
            className="max-w-[16ch] font-serif text-mega tracking-headline"
          >
            Bring the whole lab into one calm system<span className="text-eosin">.</span>
          </h2>
          <p
            data-reveal
            data-split="words"
            className="max-w-[52ch] text-body-lg text-ink-secondary sm:text-[19px] sm:leading-[30px]"
          >
            We set your lab up with you: sections, tests and prices, reference ranges, staff. Then
            your first sample goes through, end to end.
          </p>
          <div data-reveal="fade" className="flex flex-wrap items-center gap-x-8 gap-y-4">
            <Button variant="marketing" asChild>
              <a href={demoHref}>Book a demo</a>
            </Button>
            {contactEmail ? (
              <a
                href={`mailto:${contactEmail}`}
                className="text-body-lg underline decoration-ink-faint underline-offset-4 hover:decoration-ink"
              >
                {contactEmail}
              </a>
            ) : (
              <p className="text-body-lg text-ink-secondary">Demo bookings open soon.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
