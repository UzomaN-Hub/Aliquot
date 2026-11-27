import { CtaPill } from "./cta-pill";

/** The last word before the footer: a full-width Prussian band and the one action. */
export function Closing({ demoProps }: { demoProps: React.ComponentProps<"a"> }) {
  return (
    <section
      id="contact"
      aria-labelledby="contact-title"
      data-nav-tone="dark"
      className="scroll-mt-28 bg-primary px-6 py-28 text-on-primary sm:px-12 lg:py-40"
    >
      <div className="mx-auto grid max-w-[1520px] gap-14 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
        <h2
          id="contact-title"
          data-reveal
          data-drop
          className="font-serif text-mega tracking-headline"
        >
          <span className="block">Bring the whole lab</span>{" "}
          <span className="block text-on-primary/70">into one calm system.</span>
        </h2>
        <div className="flex flex-col items-start gap-8">
          <p data-reveal data-split="words" className="text-lead text-on-primary/85">
            We set your lab up with you: sections, tests and prices, reference ranges, staff. Then
            your first sample goes through, end to end.
          </p>
          <CtaPill tone="light" {...demoProps}>
            Book a demo
          </CtaPill>
          <a
            href="#contact"
            data-soon="Find your lab"
            data-soon-text="Soon you'll type your lab's name here and go straight to its sign-in page. Until then, use the address your lab gave you."
            className="text-body-lg underline decoration-on-primary/40 underline-offset-6 hover:decoration-on-primary"
          >
            Lab staff? Find your lab&apos;s sign-in
          </a>
        </div>
      </div>
    </section>
  );
}
