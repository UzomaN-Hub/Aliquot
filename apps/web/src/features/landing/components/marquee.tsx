import { cn } from "@/lib/cn";

// Only what v1 does (SCOPE.md). Two bands: what Aliquot does, and who and what it covers.
const DOES = [
  "Chemical Pathology",
  "Haematology",
  "Microbiology",
  "Barcode labels",
  "Live flags",
  "Verified releases",
  "Critical alerts",
  "Versioned results",
  "Audit trail",
  "WhatsApp result links",
  "Two-step sign-in",
];
const COVERS = [
  "Front Desk",
  "Lab Scientists",
  "Chief Scientists",
  "Managers",
  "Reference ranges by age and sex",
  "FBC and differential",
  "Culture and sensitivity",
  "Electrolytes and urea",
  "Liver function",
  "Branded PDF reports",
  "Sample tracking",
  "Section worklists",
];

function Band({
  words,
  outline,
  reverse,
}: {
  words: string[];
  outline?: boolean;
  reverse?: boolean;
}) {
  const row = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {words.map((word) => (
        <li key={word} className="flex items-center">
          <span
            className={cn(
              "px-8 font-serif text-[clamp(2.25rem,1.5rem+2.8vw,4rem)] leading-[1.1] tracking-headline whitespace-nowrap",
              outline && "text-outline",
            )}
          >
            {word}
          </span>
          <span
            aria-hidden="true"
            className={cn("size-3 shrink-0 rounded-full", outline ? "bg-eosin" : "bg-primary")}
          />
        </li>
      ))}
    </ul>
  );
  return (
    <div className={cn("marquee-track", reverse && "marquee-reverse")}>
      {row(false)}
      {row(true)}
    </div>
  );
}

/**
 * Two bands sliding in opposite directions, faster while you scroll (start-motion.ts).
 * Decorative repetition, so screen readers get each list once.
 */
export function Marquee() {
  return (
    <section
      aria-label="What Aliquot covers"
      className="marquee flex flex-col gap-4 overflow-hidden border-y border-hairline py-10"
    >
      <Band words={DOES} />
      <Band words={COVERS} outline reverse />
    </section>
  );
}
