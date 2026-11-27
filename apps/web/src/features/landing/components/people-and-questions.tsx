import { HoverAccordion, type AccordionItem } from "./hover-accordion";
import { SectionHeading } from "./section-heading";

// ROLES.md, in plain words.
const ROLES: AccordionItem[] = [
  {
    title: "Manager",
    body: "Runs the lab's setup: staff and their sections, the test catalogue and prices, reference ranges and critical limits, branding and reports.",
    meta: "Sees every section · two-step sign-in",
  },
  {
    title: "Chief Scientist",
    body: "Verifies and releases results for their sections, amends a released result with a reason, and acknowledges critical alerts.",
    meta: "Their sections · two-step sign-in",
  },
  {
    title: "Lab Scientist",
    body: "Receives or rejects samples and enters results on a keyboard-first grid. Never releases: a second pair of eyes always does.",
    meta: "Their sections",
  },
  {
    title: "Front Desk",
    body: "Registers patients, creates requests, confirms payment and prints barcode labels. Sees where a sample is, not its results.",
    meta: "Status only",
  },
];

// Honest answers about v1 (SCOPE.md, including what isn't there yet).
const QUESTIONS: AccordionItem[] = [
  {
    title: "Which labs is it for?",
    body: "Medical laboratories running Chemical Pathology, Haematology or Medical Microbiology, in any combination. Each lab gets its own address, staff and records.",
  },
  {
    title: "Do we need new equipment?",
    body: "No. It runs in the browser on the laptops and tablets you already have. Labels print on a standard barcode label printer.",
  },
  {
    title: "Does it connect to our analysers?",
    body: "Not yet. Results go in through a fast, keyboard-first grid with live flags. Analyser connection is on the roadmap.",
  },
  {
    title: "How do patients get their results?",
    body: "A secure link on WhatsApp, or SMS if WhatsApp fails. They confirm the last four digits of their phone number, then view or download a PDF with your lab's name on it.",
  },
  {
    title: "Can staff see more than they should?",
    body: "No. Staff see only the sections they're assigned to, every action is logged, and each lab's records are separated in the database itself.",
  },
  {
    title: "What does it cost?",
    body: "It depends on your lab's size and sections. Book a demo and we'll walk you through it with your numbers.",
  },
];

export function People() {
  return (
    <section
      id="people"
      aria-labelledby="people-title"
      className="scroll-mt-24 px-6 py-28 sm:px-10 lg:py-40"
    >
      <div className="mx-auto grid max-w-[1440px] gap-16 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
        <SectionHeading
          id="people-title"
          index="06"
          title="Everyone sees their part."
          intro="Four roles, each with exactly the screens and permissions its work needs. Releasing a result always takes a Chief Scientist."
        />
        <HoverAccordion items={ROLES} />
      </div>
    </section>
  );
}

export function Questions() {
  return (
    <section
      id="questions"
      aria-labelledby="questions-title"
      className="scroll-mt-24 px-6 py-28 sm:px-10 lg:py-40"
    >
      <div className="mx-auto grid max-w-[1440px] gap-16 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
        <SectionHeading id="questions-title" index="07" title="Questions labs ask." />
        <HoverAccordion items={QUESTIONS} initial={0} />
      </div>
    </section>
  );
}
