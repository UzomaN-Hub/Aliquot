import type { Metadata } from "next";

import { LabsList } from "@/features/console/components/labs-list";

export const metadata: Metadata = { title: "Labs" };

export default function ConsoleLabsPage() {
  return <LabsList />;
}
