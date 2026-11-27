const WORDS = [
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

/** A slow band of what Aliquot does. Decorative repetition, so screen readers get it once. */
export function Marquee() {
  const row = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {WORDS.map((word) => (
        <li key={word} className="flex items-center">
          <span className="px-8 font-serif text-[clamp(2rem,1.4rem+2.4vw,3.5rem)] leading-none tracking-headline whitespace-nowrap">
            {word}
          </span>
          <span aria-hidden="true" className="size-2.5 rounded-full bg-primary" />
        </li>
      ))}
    </ul>
  );

  return (
    <section
      aria-label="What Aliquot covers"
      className="marquee overflow-hidden border-y border-hairline py-10"
    >
      <div className="marquee-track">
        {row(false)}
        {row(true)}
      </div>
    </section>
  );
}
