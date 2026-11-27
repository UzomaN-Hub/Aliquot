import { SectionHeading } from "./section-heading";

// Facts about the product itself (v1 scope, FLOWS.md), never market claims we can't source.
const FACTS = [
  {
    value: 3,
    unit: "",
    label: "sections in one system",
    detail: "Chemical Pathology, Haematology, Medical Microbiology.",
  },
  {
    value: 4,
    unit: "",
    label: "roles, each seeing its part",
    detail: "Front Desk, Lab Scientist, Chief Scientist, Manager.",
  },
  {
    value: 15,
    unit: "min",
    label: "before a critical escalates",
    detail: "Unanswered alerts climb to the Chief Scientist, then the Manager.",
  },
  {
    value: 0,
    unit: "",
    label: "unverified releases",
    detail: "Every result is checked and signed by a Chief Scientist.",
  },
] as const;

export function Problem() {
  return (
    <section
      id="problem"
      aria-labelledby="problem-title"
      className="scroll-mt-28 px-6 py-28 sm:px-12 lg:py-40"
    >
      <div className="mx-auto flex max-w-[1520px] flex-col gap-24">
        <div className="grid gap-12 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
          <SectionHeading
            id="problem-title"
            index="01"
            label="The problem"
            tagline="Every handover is a risk"
            title="Paper can’t raise its hand."
            accent="Aliquot can."
          />
          <p data-reveal data-split="words" className="text-lead text-ink-secondary lg:pb-3">
            Results copied by hand, critical values phoned through, a sample&apos;s whereabouts
            known only to whoever last held it. Aliquot records every step as it happens, and speaks
            up when something can&apos;t wait.
          </p>
        </div>

        <dl className="grid grid-cols-2 border-t border-hairline lg:grid-cols-4">
          {FACTS.map((fact, i) => (
            <div
              key={fact.label}
              data-reveal="fade"
              className={`flex flex-col gap-3 pt-10 pr-6 pb-4 ${i > 0 ? "lg:border-l lg:border-hairline lg:pl-8" : ""} ${i % 2 === 1 ? "border-l border-hairline pl-6 lg:pl-8" : ""}`}
            >
              <dd className="order-1 flex items-baseline gap-2 font-serif text-[clamp(4.5rem,2.5rem+6vw,9rem)] leading-[0.9] tracking-headline">
                <span data-count={fact.value}>{fact.value}</span>
                {fact.unit && (
                  <span className="font-sans text-figure text-ink-secondary">{fact.unit}</span>
                )}
              </dd>
              <dt className="order-2 text-title font-medium">{fact.label}</dt>
              <dd className="order-3 max-w-[30ch] text-body-lg text-ink-muted">{fact.detail}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
