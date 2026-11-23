import type { Metadata } from "next";

import { serverConfig } from "@/lib/config";

import "./globals.css";

// Fonts and colour tokens arrive in Stage 2 (DESIGN.md, /styleguide).
export const metadata: Metadata = {
  title: serverConfig.PLATFORM_NAME,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
