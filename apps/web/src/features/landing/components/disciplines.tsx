import { SectionHeading } from "./section-heading";
import { Switcher, type SwitcherItem } from "./switcher";

const DISCIPLINES: SwitcherItem[] = [
  {
    name: "Chem Path",
    title: "Numbers you can trust at a glance.",
    body: "Numeric results with units, reference ranges by sex and age, and critical limits that flag themselves as they're typed.",
    points: [
      "E/U/Cr, LFT, lipid profile, FBS and your own panels",
      "eGFR (CKD-EPI 2021), Friedewald LDL, anion gap calculated",
      "H, L, CH, CL flags, never colour alone",
    ],
  },
  {
    name: "Haematology",
    title: "The whole count, not just the numbers.",
    body: "Every FBC parameter from the analyser printout and a differential count, with structured blood film comments.",
    points: [
      "Full blood count and differential",
      "Blood film comments, structured and free text",
      "ESR, blood group and Hb genotype",
    ],
  },
  {
    name: "Microbiology",
    title: "Work that spans days, kept in step.",
    body: "Microscopy, culture, identification and sensitivities, stage by stage. A preliminary report goes out early; the final one locks.",
    points: [
      "Gram stain and microscopy findings",
      "Organisms and antibiotic panels your lab configures",
      "S / I / R sensitivities, preliminary and final reports",
    ],
  },
];

/**
 * The dark section (graphite in either mode). It fills the screen when you arrive;
 * its corners round and it pulls in only as you leave (start-motion.ts morph).
 */
export function Disciplines() {
  return (
    <section id="disciplines" aria-labelledby="disciplines-title" className="scroll-mt-28">
      <div
        data-morph
        data-tone="dark"
        className="relative overflow-hidden bg-surface px-6 py-28 text-ink sm:px-12 lg:py-40"
      >
        <p
          aria-hidden="true"
          className="text-outline pointer-events-none absolute right-[-2vw] bottom-[-4vw] font-serif text-[clamp(10rem,6rem+16vw,26rem)] leading-none tracking-headline select-none"
        >
          03
        </p>
        <div className="relative mx-auto flex max-w-[1520px] flex-col gap-20">
          <SectionHeading
            id="disciplines-title"
            index="03"
            label="The sections"
            tagline="Chem path / Haem / Micro"
            title="Three disciplines."
            accent="One way of working."
            intro="Each section keeps its own worklist, its own verifiers and its own rules, inside the same calm system."
          />
          <Switcher items={DISCIPLINES} label="Lab sections" />
        </div>
      </div>
    </section>
  );
}
