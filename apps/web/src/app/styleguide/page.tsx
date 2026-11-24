import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { serverConfig } from "@/lib/config";

import { ButtonSection, FieldSection } from "./_parts/components";
import { Foundations } from "./_parts/foundations";

export const metadata: Metadata = {
  title: "Styleguide",
  robots: { index: false, follow: false },
};

const contents = [
  ["colour", "Colour"],
  ["type", "Type"],
  ["shape", "Shape"],
  ["button", "Button"],
  ["field", "Field"],
] as const;

/**
 * Every component and state on one page (DESIGN.md guardrails). Reviewed and
 * approved before page work starts. Review tool only: hidden on deployed builds
 * unless STYLEGUIDE_ENABLED=true (FRONTEND.md §4).
 */
export default function StyleguidePage() {
  if (process.env.NODE_ENV !== "development" && !serverConfig.STYLEGUIDE_ENABLED) {
    notFound();
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12">
      <header className="flex flex-col gap-4">
        <h1 className="text-display font-medium">Styleguide</h1>
        <p className="max-w-2xl text-body-lg text-ink-secondary">
          Every component and state, in light and dark. Pages are built only from what is here.
        </p>
        <nav aria-label="Sections">
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {contents.map(([id, label]) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="text-body underline decoration-ink-faint underline-offset-4 hover:decoration-ink"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <Foundations />
      <ButtonSection />
      <FieldSection />
    </main>
  );
}
