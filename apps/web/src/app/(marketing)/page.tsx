import type { Metadata } from "next";

import { Closing } from "@/features/landing/components/closing";
import { ComingSoon } from "@/features/landing/components/coming-soon";
import { Critical } from "@/features/landing/components/critical";
import { Delivery } from "@/features/landing/components/delivery";
import { Disciplines } from "@/features/landing/components/disciplines";
import { Hero } from "@/features/landing/components/hero";
import { Journey } from "@/features/landing/components/journey";
import { Marquee } from "@/features/landing/components/marquee";
import { People, Questions } from "@/features/landing/components/people-and-questions";
import { Problem } from "@/features/landing/components/problem";
import { Roadmap } from "@/features/landing/components/roadmap";
import { Safety } from "@/features/landing/components/safety";
import { SectionBar } from "@/features/landing/components/section-bar";
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
 * The landing page (PAGES.md 38, decisions 017 and 018). Fully static HTML; motion
 * attaches after first paint. Anything not built yet opens "Coming soon".
 */
export default function LandingPage() {
  const name = serverConfig.PLATFORM_NAME;
  const email = serverConfig.CONTACT_EMAIL;
  const demoProps: React.ComponentProps<"a"> = email
    ? { href: `mailto:${email}?subject=${encodeURIComponent(`${name} demo`)}` }
    : ({
        href: "#contact",
        "data-soon": "Demo bookings",
        "data-soon-text":
          "Demo bookings open very soon. We'll set up your sections, tests and staff with you and run your first sample end to end.",
      } as React.ComponentProps<"a">);

  return (
    <ComingSoon>
      <div id="top">
        <a
          href="#problem"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-surface focus:px-4 focus:py-2"
        >
          Skip to content
        </a>
        <SiteNav name={name} demoProps={demoProps} />
        <main>
          <Hero demoProps={demoProps} />
          <Marquee />
          <Problem />
          <Journey />
          <Disciplines />
          <Critical />
          <Delivery />
          <Safety />
          <People />
          <Roadmap />
          <Questions />
          <Closing demoProps={demoProps} />
        </main>
        <SiteFooter name={name} demoProps={demoProps} />
        <SectionBar />
        <LandingMotion />
      </div>
    </ComingSoon>
  );
}
