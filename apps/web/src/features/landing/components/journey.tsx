import { SectionHeading } from "./section-heading";

const STEPS = [
  {
    title: "Front desk",
    text: "Register the patient, choose tests, confirm payment. A lab number and one barcode label per container print at once.",
  },
  {
    title: "Reception",
    text: "Scan to receive, or reject with a reason: haemolysed, clotted, insufficient. The front desk is told to recollect.",
  },
  {
    title: "Bench",
    text: "Results go into a keyboard-first grid. Units, ranges and flags (H, L, CH, CL) appear as you type; eGFR and LDL calculate themselves.",
  },
  {
    title: "Verification",
    text: "A Chief Scientist of that section reviews, verifies and releases. An amendment adds a new version and keeps the old one.",
  },
  {
    title: "Delivery",
    text: "The patient gets a secure link on WhatsApp, the doctor a summary. The PDF carries your lab's name, not ours.",
  },
] as const;

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The sample's journey. On desktop the section holds still (pinned) while scrolling
 * walks through the five steps; on phones it's a plain list (start-motion.ts).
 */
export function Journey() {
  return (
    <section id="journey" aria-labelledby="journey-title" className="scroll-mt-24">
      <div data-journey className="flex min-h-dvh items-center px-6 py-28 sm:px-10 lg:py-16">
        <div className="mx-auto grid w-full max-w-[1440px] gap-16 lg:grid-cols-[1fr_1fr] lg:gap-24">
          <div className="flex flex-col justify-between gap-12">
            <SectionHeading
              id="journey-title"
              index="02"
              title="One sample. Five hands. No gaps."
              intro="Every step is recorded as it happens, so anyone can see where a sample is and who touched it last."
            />
            {/* Desktop: the current step, large. Updated by the scroll position. */}
            <div aria-hidden="true" className="hidden items-end gap-8 lg:flex">
              <div className="relative h-28 w-px bg-hairline">
                <span
                  data-journey-bar
                  className="absolute inset-x-0 top-0 h-full origin-top scale-y-0 bg-ink"
                />
              </div>
              <div className="flex flex-col gap-2">
                <p data-journey-counter className="font-mono text-body text-ink-muted">
                  01 / {pad(STEPS.length)}
                </p>
                <p data-journey-title className="font-serif text-display tracking-headline">
                  {STEPS[0].title}
                </p>
              </div>
            </div>
          </div>

          <ol className="flex flex-col">
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                data-journey-step
                data-title={step.title}
                data-reveal="fade"
                className="grid grid-cols-[3rem_1fr] gap-4 border-t border-hairline py-7 last:border-b"
              >
                <span className="font-mono text-body text-ink-muted">{pad(i + 1)}</span>
                <div className="flex flex-col gap-2">
                  <h3 className="text-title font-medium">{step.title}</h3>
                  <p className="max-w-[52ch] text-body-lg text-ink-secondary">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
