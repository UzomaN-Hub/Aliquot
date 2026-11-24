import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Flag } from "@/components/ui/flag";

import { Section, Specimen, ThemePair } from "./specimen";

const results = [
  { name: "Potassium", value: "6.8", unit: "mmol/L", range: "3.5–5.1", flag: "CH" },
  { name: "Sodium", value: "141", unit: "mmol/L", range: "135–145", flag: "N" },
  { name: "Urea", value: "9.2", unit: "mmol/L", range: "2.5–7.1", flag: "H" },
  { name: "Creatinine", value: "48", unit: "µmol/L", range: "62–106", flag: "L" },
  { name: "Glucose (fasting)", value: "1.9", unit: "mmol/L", range: "3.9–5.6", flag: "CL" },
] as const;

export function FlagSection() {
  return (
    <Section
      id="flag"
      title="Flag"
      intro="Letters always show. Criticals in Eosin, H and L in ink with an arrow. Normal shows nothing."
    >
      <ThemePair>
        <Specimen label="Each flag">
          <Flag flag="H" />
          <Flag flag="L" />
          <Flag flag="CH" />
          <Flag flag="CL" />
          <Flag flag="ABN" />
        </Specimen>
        <Specimen label="In context · result rows">
          <table className="w-full max-w-lg text-body">
            <tbody className="divide-y divide-hairline">
              {results.map((row) => (
                <tr key={row.name} className="h-10">
                  <td>{row.name}</td>
                  <td
                    className={`text-right font-mono ${row.flag.startsWith("C") ? "text-eosin-text" : ""}`}
                  >
                    {row.value}
                  </td>
                  <td className="w-12 pl-3">
                    <Flag flag={row.flag} />
                  </td>
                  <td className="font-mono text-caption text-ink-muted">{row.unit}</td>
                  <td className="text-right font-mono text-caption text-ink-muted">{row.range}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Specimen>
      </ThemePair>
    </Section>
  );
}

export function BannerSection() {
  return (
    <Section
      id="banner"
      title="Banner"
      intro="An ongoing condition, at the top of the page or section. Stays until the condition clears; no close button."
    >
      <ThemePair>
        <Specimen label="Critical">
          <Banner
            severity="critical"
            className="w-full"
            action={<Button variant="link">Review alerts</Button>}
          >
            3 critical results not acknowledged.
          </Banner>
        </Specimen>
        <Specimen label="Warning">
          <Banner severity="warning" className="w-full">
            You&apos;re offline. Changes can&apos;t be saved until you reconnect.
          </Banner>
        </Specimen>
        <Specimen label="Success">
          <Banner severity="success" className="w-full">
            Catalogue published. New requests use the updated prices.
          </Banner>
        </Specimen>
        <Specimen label="Info">
          <Banner severity="info" className="w-full">
            Haematology turnaround is running 20 min behind.
          </Banner>
        </Specimen>
      </ThemePair>
    </Section>
  );
}
