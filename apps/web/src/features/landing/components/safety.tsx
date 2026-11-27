import { SectionHeading } from "./section-heading";

// Only what Aliquot v1 actually does (ARCHITECTURE.md §9, decisions 012, 013, 015).
const PROMISES = [
  {
    title: "Every lab walled off",
    text: "Each lab's records are separated inside the database itself, not only in the code. One lab can never see another's.",
  },
  {
    title: "Nothing quietly changes",
    text: "Results are versioned. An amendment adds a new version with its reason; the earlier one stays on record.",
  },
  {
    title: "A log that can't be edited",
    text: "Who did what, and when, for every change. The database refuses edits and deletions to it.",
  },
  {
    title: "Two-step sign-in",
    text: "Managers and Chief Scientists confirm each sign-in with a code from their phone.",
  },
  {
    title: "Links that expire",
    text: "Patients confirm the last four digits of their phone number to open a result. Links expire after seven days.",
  },
  {
    title: "Encrypted and close by",
    text: "Encrypted in transit and at rest, on servers in Frankfurt: the nearest region to Nigeria among our providers.",
  },
] as const;

export function Safety() {
  return (
    <section
      id="safety"
      aria-labelledby="safety-title"
      className="scroll-mt-28 px-6 py-28 sm:px-12 lg:py-40"
    >
      <div className="mx-auto flex max-w-[1520px] flex-col gap-20">
        <div className="grid gap-12 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
          <SectionHeading
            id="safety-title"
            index="06"
            label="Safety"
            tagline="Built in, not bolted on"
            title="Built for"
            accent="medical records."
          />
          <p data-reveal data-split="words" className="text-lead text-ink-secondary lg:pb-3">
            A result is a medico-legal document. The safeguards are part of the foundations, not a
            setting someone can forget to turn on.
          </p>
        </div>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PROMISES.map((promise, i) => (
            <li
              key={promise.title}
              data-surface
              data-reveal="fade"
              className="group flex min-h-72 flex-col justify-between gap-12 rounded-panel border border-hairline bg-surface-raised p-9 transition-colors duration-500 hover:border-primary hover:bg-primary"
            >
              <span className="font-mono text-body text-primary transition-colors duration-500 group-hover:text-on-primary">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex flex-col gap-3">
                <h3 className="font-serif text-figure leading-tight tracking-headline transition-colors duration-500 group-hover:text-on-primary">
                  {promise.title}
                </h3>
                <p className="text-body-lg text-ink-secondary transition-colors duration-500 group-hover:text-on-primary">
                  {promise.text}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
