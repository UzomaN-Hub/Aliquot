import type { Metadata } from "next";

import { CreateLabForm } from "@/features/console/components/create-lab-form";

export const metadata: Metadata = { title: "Create a lab" };

export default function CreateLabPage() {
  return <CreateLabForm />;
}
