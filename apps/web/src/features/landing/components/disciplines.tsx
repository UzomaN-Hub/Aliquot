import { SectionHeading } from "./section-heading";

const DISCIPLINES = [
  {
    name: "Chemical Pathology",
    text: "Numeric results with units, ranges by sex and age, and critical limits. eGFR (CKD-EPI 2021), Friedewald LDL and anion gap are calculated for you.",
    panels: "E/U/Cr · LFT · Lipid profile · FBS",
  },
  {
    name: "Haematology",
    text: "Every FBC parameter and a differential count, structured blood film comments, ESR, blood group and genotype.",
    panels: "FBC · Differential · ESR · Group & genotype",
  },
  {
    name: "Medical Microbiology",
    text: "Work that spans days: microscopy, culture, identification and sensitivities. A preliminary report goes out early; the final one locks.",
    panels: "Gram stain · Culture · ID · S / I / R",
  },
] as const;

/**
 * The dark section (graphite whatever the page theme). As it scrolls in, its rounded,
 * inset frame opens to the full width; as it leaves, it closes again (start-motion.ts).
 */
export function Disciplines() {
  return (
    <section id="disciplines" aria-labelledby="disciplines-title" className="scroll-mt-24 py-6">
      <div
        data-morph
        data-theme="dark"
        className="overflow-hidden bg-surface px-6 py-28 text-ink sm:px-10 lg:py-40"
      >
        <div className="mx-auto flex max-w-[1440px] flex-col gap-20">
          <SectionHeading
            id="disciplines-title"
            index="03"
            title="Three disciplines. One way of working."
            intro="Each section keeps its own worklist, its own verifiers and its own rules, inside the same calm system."
          />
          <ul className="grid gap-px overflow-hidden rounded-panel bg-hairline lg:grid-cols-3">
            {DISCIPLINES.map((discipline) => (
              <li
                key={discipline.name}
                data-reveal="fade"
                className="group flex min-h-80 flex-col justify-between gap-12 bg-surface p-8 transition-colors duration-500 hover:bg-primary hover:text-on-primary sm:p-10"
              >
                <h3 className="font-serif text-display tracking-headline">{discipline.name}</h3>
                <div className="flex flex-col gap-6">
                  <p className="text-body-lg text-ink-secondary transition-colors duration-500 group-hover:text-on-primary">
                    {discipline.text}
                  </p>
                  <p className="font-mono text-body text-ink-muted transition-colors duration-500 group-hover:text-on-primary">
                    {discipline.panels}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
