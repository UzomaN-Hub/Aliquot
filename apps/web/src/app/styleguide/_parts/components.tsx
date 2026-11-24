import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";

import { PendingDemo } from "./pending-demo";
import { Section, Specimen, ThemePair } from "./specimen";

export function ButtonSection() {
  return (
    <Section
      id="button"
      title="Button"
      intro="One filled button per screen. Every other action is an underlined text link."
    >
      <ThemePair>
        <Specimen label="Primary · bench 36px">
          <Button>Release result</Button>
        </Specimen>
        <Specimen label="Primary · touch 44px" note="front desk, public pages">
          <Button size="lg">Sign in</Button>
        </Specimen>
        <Specimen label="Pending" note="click it: same width, no spinner, repeat clicks ignored">
          <PendingDemo />
          <Button pending pendingLabel="Releasing…">
            Release result
          </Button>
        </Specimen>
        <Specimen label="Disabled" note="rare: only when it can never apply, with the reason">
          <Button disabled>Release result</Button>
          <span className="text-caption text-ink-muted">Enter all results first.</span>
        </Specimen>
        <Specimen label="Text link · secondary actions">
          <Button variant="link">Send back to bench</Button>
          <Button variant="link" asChild>
            <a href="#button">Forgot password?</a>
          </Button>
        </Specimen>
        <Specimen label="Marketing pill" note="landing page only">
          <Button variant="marketing">Book a demo</Button>
        </Specimen>
      </ThemePair>
    </Section>
  );
}

export function FieldSection() {
  return (
    <Section
      id="field"
      title="Field"
      intro="Label, then hint, then the control, then the error. Errors appear on blur or submit, never while typing."
    >
      <ThemePair>
        <div className="grid max-w-md gap-6">
          <Field label="Email">
            <Input type="email" autoComplete="off" placeholder="name@demo-lab.example" />
          </Field>
          <Field label="Phone" hint="Used for result links on WhatsApp.">
            <Input type="tel" autoComplete="off" />
          </Field>
          <Field label="Hospital no." optional>
            <Input autoComplete="off" />
          </Field>
          <Field label="Date of birth" hint="DD/MM/YYYY" error="Enter a date in the past.">
            <Input autoComplete="off" defaultValue="12/03/2031" />
          </Field>
          <Field label="Password">
            <PasswordInput autoComplete="off" />
          </Field>
          <Field label="Lab no." hint="Mono for numbers people read back.">
            <Input mono autoComplete="off" defaultValue="CP-261124-0042" />
          </Field>
          <Field label="Clinical details" optional>
            <Textarea placeholder="Known diabetic, on metformin." />
          </Field>
          <Field label="Email" hint="Touch size, 44px.">
            <Input size="lg" type="email" autoComplete="off" />
          </Field>
          <Field label="Price" hint="Read-only: set by the catalogue.">
            <Input mono readOnly defaultValue="₦4,500" />
          </Field>
          <Field label="Section" hint="Disabled: rare, always with the reason.">
            <Input disabled defaultValue="Haematology" />
          </Field>
        </div>
      </ThemePair>
    </Section>
  );
}
