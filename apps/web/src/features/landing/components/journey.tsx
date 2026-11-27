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
    text: "A keyboard-first grid. Units, ranges and flags (H, L, CH, CL) appear as you type; eGFR and LDL calculate themselves.",
  },
  {
    title: "Verification",
    text: "A Chief Scientist of that section reviews, verifies and releases. An amendment adds a version and keeps the old one.",
  },
  {
    title: "Delivery",
    text: "The patient gets a secure link on WhatsApp, the doctor a summary. The PDF carries your lab's name, not ours.",
  },
] as const;

const pad = (n: number) => String(n).padStart(2, "0");
const STATION_X = (i: number) => 40 + i * 130; // 5 stations across a 600-wide track

/**
 * The sample's journey. Desktop: the section holds briefly while scrolling moves a
 * sample tube along the track, lighting each station and telling its step; it never
 * stands still. Phones: a plain list (start-motion.ts journeyPin).
 */
export function Journey() {
  return (
    <section id="journey" aria-labelledby="journey-title" className="scroll-mt-28">
      <div data-journey className="flex min-h-dvh items-center px-6 py-28 sm:px-12 lg:py-20">
        <div className="mx-auto grid w-full max-w-[1520px] gap-16 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-20">
          <SectionHeading
            id="journey-title"
            index="02"
            label="The journey"
            tagline="Front desk to result"
            title="One sample."
            accent="Five hands. No gaps."
            intro="Every step is recorded as it happens, so anyone can see where a sample is and who touched it last."
          />

          <div>
            {/* Desktop tracker (the list below carries the same words for screen readers). */}
            <div aria-hidden="true" className="hidden flex-col gap-12 lg:flex">
              <svg viewBox="0 0 600 150" className="w-full overflow-visible">
                <line
                  x1="40"
                  y1="60"
                  x2="560"
                  y2="60"
                  className="stroke-hairline"
                  strokeWidth="2"
                />
                <line
                  data-journey-bar
                  x1="40"
                  y1="60"
                  x2="560"
                  y2="60"
                  className="stroke-primary"
                  strokeWidth="2"
                />
                {STEPS.map((step, i) => (
                  <g key={step.title} data-station={i}>
                    <circle
                      cx={STATION_X(i)}
                      cy="60"
                      r="11"
                      className="station fill-surface stroke-ink-faint"
                      strokeWidth="2"
                    />
                    <text
                      x={STATION_X(i)}
                      y="112"
                      textAnchor="middle"
                      className="station-label fill-ink-muted font-mono text-[13px]"
                    >
                      {step.title}
                    </text>
                  </g>
                ))}
                <g data-journey-tube>
                  <rect
                    x="31"
                    y="4"
                    width="18"
                    height="40"
                    rx="9"
                    className="fill-surface-raised stroke-ink"
                    strokeWidth="2"
                  />
                  <rect x="27" y="-2" width="26" height="8" rx="2" className="fill-primary" />
                  <rect x="34" y="20" width="12" height="21" rx="6" className="fill-eosin" />
                </g>
              </svg>
              <div className="flex flex-col gap-4 border-t border-hairline pt-8">
                <p data-journey-counter className="font-mono text-body text-primary">
                  01 / {pad(STEPS.length)}
                </p>
                <p
                  data-journey-title
                  className="font-serif text-[clamp(2.5rem,1.6rem+2.4vw,4rem)] leading-none tracking-headline"
                >
                  {STEPS[0].title}
                </p>
                <p data-journey-text className="max-w-[46ch] text-lead text-ink-secondary">
                  {STEPS[0].text}
                </p>
              </div>
            </div>

            <ol className="flex flex-col lg:sr-only">
              {STEPS.map((step, i) => (
                <li
                  key={step.title}
                  data-journey-step
                  data-title={step.title}
                  data-text={step.text}
                  data-reveal="fade"
                  className="grid grid-cols-[3rem_1fr] gap-4 border-t border-hairline py-7 last:border-b"
                >
                  <span className="font-mono text-body text-primary">{pad(i + 1)}</span>
                  <div className="flex flex-col gap-2">
                    <h3 className="text-title font-medium">{step.title}</h3>
                    <p className="text-lead text-ink-secondary">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
