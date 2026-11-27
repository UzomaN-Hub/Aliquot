import { HoverAccordion, type AccordionItem } from "./hover-accordion";
import { SectionHeading } from "./section-heading";
import { Switcher, type SwitcherItem } from "./switcher";

// ROLES.md, in plain words.
const ROLES: SwitcherItem[] = [
  {
    name: "Managers",
    title: "Your lab, set up your way.",
    body: "Staff and their sections, the test catalogue and prices, reference ranges and critical limits, branding and reports.",
    points: ["Sees every section", "Daily report at 07:00", "Two-step sign-in"],
  },
  {
    name: "Chief Scientists",
    title: "Nothing leaves without you.",
    body: "Verify and release results for your sections, amend a released result with a reason, acknowledge critical alerts.",
    points: ["Verification queue, STAT first", "Amendments keep every version", "Two-step sign-in"],
  },
  {
    name: "Lab Scientists",
    title: "Fast at the bench.",
    body: "Receive or reject samples and enter results on a keyboard-first grid with live flags. A second pair of eyes always releases.",
    points: ["Live worklist for your sections", "Flags as you type", "Calculated values filled in"],
  },
  {
    name: "Front Desk",
    title: "Registration in a minute.",
    body: "Register patients, create requests, confirm payment and print barcode labels. See where a sample is, never its results.",
    points: ["Duplicate patient warnings", "One label per container", "Status at a glance"],
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
      className="scroll-mt-28 px-6 py-28 sm:px-12 lg:py-40"
    >
      <div className="mx-auto flex max-w-[1520px] flex-col gap-20">
        <SectionHeading
          id="people-title"
          index="07"
          label="Roles"
          tagline="One lab, every perspective"
          title="Different roles."
          accent="One shared record."
        />
        <Switcher items={ROLES} label="Roles in a lab" />
      </div>
    </section>
  );
}

export function Questions() {
  return (
    <section
      id="questions"
      aria-labelledby="questions-title"
      className="scroll-mt-28 px-6 py-28 sm:px-12 lg:py-40"
    >
      <div className="mx-auto grid max-w-[1520px] gap-16 lg:grid-cols-[0.85fr_1.15fr] lg:gap-24">
        <SectionHeading
          id="questions-title"
          index="09"
          label="Questions"
          tagline="The details matter"
          title="Questions"
          accent="labs ask."
        />
        <HoverAccordion items={QUESTIONS} initial={0} />
      </div>
    </section>
  );
}
