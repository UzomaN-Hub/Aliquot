import type { Metadata } from "next";

import { Closing } from "@/features/landing/components/closing";
import { Critical } from "@/features/landing/components/critical";
import { Disciplines } from "@/features/landing/components/disciplines";
import { Hero } from "@/features/landing/components/hero";
import { Journey } from "@/features/landing/components/journey";
import { People, Questions } from "@/features/landing/components/people-and-questions";
import { Problem } from "@/features/landing/components/problem";
import { Safety } from "@/features/landing/components/safety";
import { SiteFooter } from "@/features/landing/components/site-footer";
import { SiteNav } from "@/features/landing/components/site-nav";
import { LandingMotion } from "@/features/landing/motion/landing-motion";
import { serverConfig } from "@/lib/config";

const description =
  "A laboratory information system for Chemical Pathology, Haematology and Medical Microbiology: from the front desk to the verified result, with every value, flag and signature on record.";

export const metadata: Metadata = {
  title: `${serverConfig.PLATFORM_NAME}: every sample, accounted for`,
  description,
  openGraph: { title: serverConfig.PLATFORM_NAME, description, type: "website" },
};

/**
 * The landing page (PAGES.md 38, ANIMATION.md, decision 017). Fully static: the
 * content is HTML from the build, and the motion attaches after first paint.
 */
export default function LandingPage() {
  const name = serverConfig.PLATFORM_NAME;
  const email = serverConfig.CONTACT_EMAIL;
  const demoHref = email
    ? `mailto:${email}?subject=${encodeURIComponent(`${name} demo`)}`
    : "#contact";

  return (
    <div id="top">
      <a
        href="#problem"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-surface focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <SiteNav name={name} demoHref={demoHref} />
      <main>
        <Hero demoHref={demoHref} />
        <Problem />
        <Journey />
        <Disciplines />
        <Critical />
        <Safety />
        <People />
        <Questions />
        <Closing demoHref={demoHref} contactEmail={email} />
      </main>
      <SiteFooter name={name} />
      <LandingMotion />
    </div>
  );
}
