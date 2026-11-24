import { Section, Specimen, ThemePair } from "./specimen";

// Class names are written out in full so Tailwind can find them.
const colours = [
  { name: "surface", className: "bg-surface", use: "Every background (Bone)" },
  { name: "ink", className: "bg-ink", use: "Text, primary button (Haematoxylin)" },
  { name: "ink-secondary", className: "bg-ink-secondary", use: "Secondary text" },
  { name: "ink-muted", className: "bg-ink-muted", use: "Smallest text colour allowed" },
  { name: "ink-faint", className: "bg-ink-faint", use: "Non-text only: field edges, marks" },
  { name: "selected", className: "bg-selected", use: "Selected row, warning background" },
  { name: "hover", className: "bg-hover", use: "Row hover, read-only field" },
  { name: "hairline", className: "bg-hairline", use: "Dividers" },
  { name: "eosin", className: "bg-eosin", use: "Critical fills and borders, under 5%" },
  { name: "eosin-text", className: "bg-eosin-text", use: "Critical and STAT text" },
] as const;

export function Foundations() {
  return (
    <>
      <Section
        id="colour"
        title="Colour"
        intro="Bone, Haematoxylin and Eosin, plus tints mixed from them. Nothing else exists in the code."
      >
        <ThemePair>
          <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {colours.map((colour) => (
              <li key={colour.name} className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className={`size-9 shrink-0 rounded-control border border-hairline ${colour.className}`}
                />
                <span className="flex flex-col">
                  <span className="font-mono text-caption">{colour.name}</span>
                  <span className="text-caption text-ink-muted">{colour.use}</span>
                </span>
              </li>
            ))}
          </ul>
        </ThemePair>
      </Section>

      <Section
        id="type"
        title="Type"
        intro="Atkinson Hyperlegible Next for the interface, Mono for values and lab numbers, Instrument Serif for the lab name and landing headlines only."
      >
        <ThemePair>
          <Specimen label="Lab wordmark · Instrument Serif 44">
            <p className="font-serif text-hero-sm tracking-headline">Demo Diagnostic Laboratory</p>
          </Specimen>
          <Specimen label="Display 36 · Figure 28 · Title 20">
            <div className="flex flex-col gap-2">
              <p className="text-display">18 waiting</p>
              <p className="text-figure">142 released today</p>
              <p className="text-title">Verification queue</p>
            </div>
          </Specimen>
          <Specimen label="Body 16 (public) · Body 14 (app) · Caption 12">
            <div className="flex flex-col gap-1">
              <p className="text-body-lg">Your result is ready to view.</p>
              <p className="text-body">Sample received at 08:15 by the bench.</p>
              <p className="text-caption text-ink-muted">Received</p>
            </div>
          </Specimen>
          <Specimen label="Mono · tabular figures">
            <div className="flex flex-col gap-1 font-mono text-body">
              <p>CP-261124-0042</p>
              <p>
                K<sup>+</sup> 6.8 mmol/L <span className="text-eosin-text">CH</span>
              </p>
              <p>
                Na<sup>+</sup> 141 mmol/L
              </p>
            </div>
          </Specimen>
        </ThemePair>
      </Section>

      <Section
        id="shape"
        title="Shape"
        intro="Near-square (decision 009). Controls 2px, panels 4px. Table rows are square, divided by hairlines."
      >
        <ThemePair>
          <Specimen label="Control 2px · Panel 4px · Landing hero 28px">
            <span className="h-12 w-24 rounded-control border border-ink-faint" />
            <span className="h-12 w-24 rounded-panel border border-ink-faint" />
            <span className="h-12 w-24 rounded-hero border border-ink-faint" />
          </Specimen>
        </ThemePair>
      </Section>
    </>
  );
}
