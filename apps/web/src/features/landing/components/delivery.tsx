import { SectionHeading } from "./section-heading";

const POINTS = [
  "A secure link on WhatsApp, SMS if WhatsApp fails",
  "Opened with the last four digits of the patient's phone",
  "A PDF with your lab's name, signed by the verifier",
  "Links expire after seven days; a new one is a click away",
];

/**
 * Results reach the patient. A phone (drawn in HTML, no screenshots) receives the
 * lab's message, then the result slip slides up. Plays each time you arrive
 * (start-motion.ts delivery). Fictional lab and patient.
 */
export function Delivery() {
  return (
    <section
      id="delivery"
      aria-labelledby="delivery-title"
      className="scroll-mt-28 px-6 py-28 sm:px-12 lg:py-40"
    >
      <div className="mx-auto grid max-w-[1520px] items-center gap-16 lg:grid-cols-[1fr_1fr] lg:gap-24">
        <div className="flex flex-col gap-12">
          <SectionHeading
            id="delivery-title"
            index="05"
            label="Delivery"
            tagline="Released means received"
            title="Results reach patients."
            accent="Without the queue."
            intro="The moment a Chief Scientist releases a result, the patient and the requesting doctor are told. Nobody waits at the counter for a printout."
          />
          <ul className="flex flex-col gap-4">
            {POINTS.map((point) => (
              <li
                key={point}
                data-reveal="fade"
                className="flex items-baseline gap-4 border-t border-hairline pt-4 text-lead"
              >
                <span aria-hidden="true" className="text-primary">
                  ✓
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>

        {/* The phone: purely illustrative, so screen readers skip it. */}
        <div aria-hidden="true" data-delivery className="relative mx-auto w-full max-w-[380px]">
          <div data-tone="dark" className="rounded-[44px] bg-surface p-3 shadow-overlay">
            <div
              data-tone="light"
              className="flex min-h-[600px] flex-col gap-5 overflow-hidden rounded-[34px] bg-surface p-5 text-ink"
              style={{ colorScheme: "light" }}
            >
              <div className="flex items-center justify-between font-mono text-caption text-ink-muted">
                <span>09:41</span>
                <span>Tavnit Labs</span>
              </div>
              <div
                data-delivery-message
                className="max-w-[86%] rounded-2xl rounded-tl-sm bg-surface-raised p-4 text-body shadow-overlay"
              >
                <p className="font-medium">Tavnit Labs</p>
                <p className="mt-1 text-ink-secondary">
                  Hello Amaka, your result is ready. Open it with the last four digits of your phone
                  number. The link expires in 7 days.
                </p>
                <p className="mt-2 font-mono text-caption text-primary underline">open result ↗</p>
              </div>
              <div
                data-delivery-typing
                className="flex w-fit gap-1.5 rounded-2xl bg-surface-raised px-4 py-3"
              >
                <span className="size-2 rounded-full bg-ink-faint" />
                <span className="size-2 rounded-full bg-ink-faint" />
                <span className="size-2 rounded-full bg-ink-faint" />
              </div>
              <div
                data-delivery-slip
                className="mt-auto flex flex-col gap-3 rounded-2xl border border-hairline bg-surface-raised p-5"
              >
                <div className="flex items-baseline justify-between border-b border-hairline pb-3">
                  <p className="font-serif text-title tracking-headline">Tavnit Labs</p>
                  <p className="font-mono text-caption text-ink-muted">Result slip</p>
                </div>
                {[
                  ["Sodium", "139", "mmol/L", ""],
                  ["Potassium", "4.2", "mmol/L", ""],
                  ["Urea", "8.9", "mmol/L", "H↑"],
                  ["Creatinine", "88", "µmol/L", ""],
                ].map(([name, value, unit, flag]) => (
                  <div
                    key={name}
                    data-delivery-row
                    className="grid grid-cols-[1fr_auto_3.5rem_2rem] items-baseline gap-2 text-body"
                  >
                    <span>{name}</span>
                    <span className="font-mono">{value}</span>
                    <span className="font-mono text-caption text-ink-muted">{unit}</span>
                    <span className="font-mono text-caption font-semibold text-primary">
                      {flag}
                    </span>
                  </div>
                ))}
                <p className="border-t border-hairline pt-3 font-mono text-caption text-ink-muted">
                  Verified by T. Bakare · Chief Scientist
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
