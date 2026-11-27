import { SectionHeading } from "./section-heading";

// SCOPE.md "Not in v1" and BUILD_PLAN "after v1": honest, and each says so when clicked.
const NEXT = [
  {
    code: "HL7",
    title: "Analyser connection",
    text: "Results flow straight from your analysers, through HL7 and ASTM.",
  },
  {
    code: "QC",
    title: "Quality control",
    text: "Levey-Jennings charts and Westgard rules on every run.",
  },
  {
    code: "Δ",
    title: "Delta checks",
    text: "A result that jumps against the patient's last one asks for a second look.",
  },
  {
    code: "TAT",
    title: "Turnaround dashboard",
    text: "Where time goes, by section, test and shift.",
  },
  {
    code: "Dr",
    title: "Doctor portal",
    text: "Requesting doctors see their patients' results in one place.",
  },
  {
    code: "₦",
    title: "Invoices and payments",
    text: "Receipts, HMO billing and online payment, beside the request.",
  },
] as const;

export function Roadmap() {
  return (
    <section
      id="next"
      aria-labelledby="next-title"
      className="scroll-mt-28 px-6 py-28 sm:px-12 lg:py-40"
    >
      <div className="mx-auto flex max-w-[1520px] flex-col gap-20">
        <div className="grid gap-12 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
          <SectionHeading
            id="next-title"
            index="08"
            label="What's next"
            tagline="After version one"
            title="Where Aliquot"
            accent="goes next."
          />
          <p data-reveal data-split="words" className="text-lead text-ink-secondary lg:pb-3">
            Version one does the essentials properly. These come next, in the order labs ask for
            them.
          </p>
        </div>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {NEXT.map((item) => (
            <li key={item.title} data-reveal="fade">
              <a
                href="#next"
                data-soon={item.title}
                data-surface
                className="group flex h-full min-h-60 flex-col justify-between gap-10 rounded-panel border border-hairline bg-surface-raised p-9 transition-colors duration-500 hover:border-ink hover:bg-ink"
              >
                <div className="flex items-start justify-between gap-6">
                  <span className="font-serif text-[clamp(3rem,2rem+2.4vw,4.5rem)] leading-none tracking-headline text-primary transition-colors duration-500 group-hover:text-surface">
                    {item.code}
                  </span>
                  <span className="rounded-full border border-hairline px-3 py-1 font-mono text-caption text-ink-muted uppercase transition-colors duration-500 group-hover:border-surface/30 group-hover:text-surface">
                    Coming soon
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-title font-medium transition-colors duration-500 group-hover:text-surface">
                    {item.title}
                  </h3>
                  <p className="text-body-lg text-ink-secondary transition-colors duration-500 group-hover:text-surface/80">
                    {item.text}
                  </p>
                </div>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
