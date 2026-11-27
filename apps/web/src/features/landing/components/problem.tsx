import { SectionHeading } from "./section-heading";

// Facts about the product itself (v1 scope, FLOWS.md), never market claims we can't source.
const FACTS = [
  {
    value: 3,
    unit: "",
    label: "disciplines in one system",
    detail: "Chemical Pathology, Haematology, Medical Microbiology",
  },
  {
    value: 4,
    unit: "",
    label: "roles, each seeing only its part",
    detail: "Front Desk to Manager",
  },
  {
    value: 15,
    unit: "min",
    label: "before an unanswered critical result escalates",
    detail: "Set by each lab",
  },
  {
    value: 0,
    unit: "",
    label: "results released without a Chief Scientist",
    detail: "Every release is verified and signed",
  },
] as const;

export function Problem() {
  return (
    <section
      id="problem"
      aria-labelledby="problem-title"
      className="scroll-mt-24 px-6 py-28 sm:px-10 lg:py-40"
    >
      <div className="mx-auto grid max-w-[1440px] gap-16 lg:grid-cols-[1fr_1fr] lg:gap-24">
        <SectionHeading
          id="problem-title"
          index="01"
          title="Paper can't raise its hand."
          intro="Results copied by hand, critical values phoned through, a sample's whereabouts known only to whoever last held it. Every handover is a chance to lose something that matters to a patient."
        />
        <dl className="grid grid-cols-2 gap-x-6 gap-y-12 self-end sm:gap-x-10">
          {FACTS.map((fact) => (
            <div
              key={fact.label}
              data-reveal="fade"
              className="flex flex-col gap-2 border-t border-hairline pt-5"
            >
              <dt className="order-2 text-body-lg text-ink">{fact.label}</dt>
              <dd className="order-1 flex items-baseline gap-1 font-serif text-[clamp(3rem,2rem+4vw,5.5rem)] leading-none tracking-headline">
                <span data-count={fact.value}>{fact.value}</span>
                {fact.unit && (
                  <span className="font-sans text-title text-ink-secondary">{fact.unit}</span>
                )}
              </dd>
              <dd className="order-3 text-body text-ink-muted">{fact.detail}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
