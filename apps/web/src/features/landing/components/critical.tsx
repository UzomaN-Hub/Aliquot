import { SectionHeading } from "./section-heading";

const LADDER = [
  { who: "Requesting doctor", how: "WhatsApp, SMS if it fails", when: "at once" },
  { who: "Chief Scientist", how: "of that section, in the app", when: "after 15 min" },
  { who: "Manager", how: "in the app and by message", when: "after 30 min" },
] as const;

/**
 * The critical-value demo (ANIMATION.md). Without motion it shows the end state; with
 * motion it plays every time you arrive: the value climbs, turns Eosin, the escalation
 * line draws and the acknowledgement lands (start-motion.ts critical).
 */
export function Critical() {
  return (
    <section
      id="critical"
      aria-labelledby="critical-title"
      className="relative scroll-mt-28 overflow-hidden px-6 py-28 sm:px-12 lg:py-40"
    >
      <p
        aria-hidden="true"
        className="text-outline pointer-events-none absolute right-[-3vw] bottom-0 font-serif text-[clamp(10rem,6rem+18vw,30rem)] leading-[0.8] tracking-headline select-none"
      >
        K⁺
      </p>
      <div className="relative mx-auto grid max-w-[1520px] items-center gap-16 lg:grid-cols-[1fr_1fr] lg:gap-24">
        <SectionHeading
          id="critical-title"
          index="04"
          label="Critical results"
          tagline="Escalates until answered"
          title="A critical result"
          accent="never waits in a tray."
          intro="When a value crosses a critical limit it turns red as it's typed. On saving, the requesting doctor is alerted with a one-tap acknowledgement. Unanswered, it climbs."
        />

        <div
          data-critical
          data-surface
          className="flex flex-col gap-10 rounded-panel border border-hairline bg-surface-raised p-8 shadow-overlay sm:p-10"
        >
          <div className="flex items-baseline justify-between gap-6 border-b border-hairline pb-8">
            <div className="flex flex-col gap-1">
              <p className="text-title font-medium">Potassium</p>
              <p className="font-mono text-body text-ink-muted">Ref. 3.5–5.1 · critical ≥ 6.5</p>
            </div>
            <p className="flex items-baseline gap-3 font-mono">
              <span
                data-critical-value
                data-state="critical"
                className="text-[clamp(3rem,2rem+3.5vw,5rem)] leading-none data-[state=critical]:text-eosin-text"
              >
                6.8
              </span>
              <span className="text-body-lg text-ink-muted">mmol/L</span>
              <span data-critical-flag className="text-title font-semibold text-eosin-text">
                CH↑
              </span>
            </p>
          </div>

          <ol className="relative flex flex-col gap-8 pl-10">
            <svg
              aria-hidden="true"
              className="absolute top-2 bottom-2 left-[7px] h-[calc(100%-1rem)] w-0.5 overflow-visible"
              preserveAspectRatio="none"
              viewBox="0 0 2 100"
            >
              <path
                data-draw
                d="M1 0 V100"
                pathLength={1}
                strokeDasharray="1"
                className="stroke-eosin"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            {LADDER.map((step) => (
              <li key={step.who} data-critical-step className="relative flex flex-col gap-1">
                <span
                  aria-hidden="true"
                  className="absolute top-1.5 -left-10 size-4 rounded-full border-2 border-eosin bg-surface-raised"
                />
                <p className="text-lead font-medium">
                  {step.who} <span className="font-normal text-ink-muted">· {step.when}</span>
                </p>
                <p className="text-body-lg text-ink-secondary">{step.how}</p>
              </li>
            ))}
            <li data-critical-step className="relative flex flex-col gap-1">
              <span
                aria-hidden="true"
                className="absolute top-1.5 -left-10 grid size-4 place-items-center rounded-full bg-primary text-[10px] text-on-primary"
              >
                ✓
              </span>
              <p className="text-lead font-medium">Acknowledged, and the escalation stops</p>
              <p className="text-body-lg text-ink-secondary">
                Whoever answers first. Who and when go in the audit log.
              </p>
            </li>
          </ol>
        </div>
      </div>
    </section>
  );
}
