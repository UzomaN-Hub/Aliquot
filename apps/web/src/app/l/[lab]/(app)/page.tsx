import type { Metadata } from "next";

import { Home } from "@/features/home/components/home";

export const metadata: Metadata = { title: "Home" };

export default function LabHomePage() {
  return <Home />;
}
