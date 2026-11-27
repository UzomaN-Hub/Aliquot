import type { Metadata } from "next";
import {
  Atkinson_Hyperlegible_Mono,
  Atkinson_Hyperlegible_Next,
  Instrument_Serif,
} from "next/font/google";

import { ThemeController } from "@/components/ui/theme-controller";
import { serverConfig } from "@/lib/config";
import { motionBootScript } from "@/lib/motion/motion";
import { themeBootScript } from "@/lib/theme/theme";

import "@/styles/globals.css";

// Self-hosted at build time by next/font: no request to Google from the browser,
// no layout shift (size-adjusted fallbacks). The only three families (DESIGN.md).
const atkinsonNext = Atkinson_Hyperlegible_Next({
  subsets: ["latin"],
  variable: "--font-atkinson-next",
  display: "swap",
});
const atkinsonMono = Atkinson_Hyperlegible_Mono({
  subsets: ["latin"],
  variable: "--font-atkinson-mono",
  display: "swap",
});
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: serverConfig.PLATFORM_NAME,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The boot script sets data-theme before paint, so server and client markup
    // differ on <html> by design (suppressHydrationWarning covers that one element).
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${atkinsonNext.variable} ${atkinsonMono.variable} ${instrumentSerif.variable}`}
    >
      <head>
        {/* Static string from lib/theme (no user data); gets the CSP nonce when proxy.ts lands. */}
        <script dangerouslySetInnerHTML={{ __html: themeBootScript + motionBootScript }} />
      </head>
      <body>
        <ThemeController />
        {children}
      </body>
    </html>
  );
}
