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
      className="scroll-mt-24 px-6 py-28 sm:px-10 lg:py-40"
    >
      <div className="mx-auto flex max-w-[1440px] flex-col gap-20">
        <SectionHeading
          id="safety-title"
          index="05"
          title="Built for medical records."
          intro="A result is a medico-legal document. The safeguards are part of the foundations, not a setting someone can forget to turn on."
        />
        <ul className="grid gap-px overflow-hidden rounded-panel border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-3">
          {PROMISES.map((promise, i) => (
            <li
              key={promise.title}
              data-reveal="fade"
              className="flex min-h-64 flex-col justify-between gap-10 bg-surface p-8 transition-colors duration-500 hover:bg-selected"
            >
              <span className="font-mono text-body text-ink-muted">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex flex-col gap-3">
                <h3 className="text-title font-medium">{promise.title}</h3>
                <p className="text-body-lg text-ink-secondary">{promise.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
