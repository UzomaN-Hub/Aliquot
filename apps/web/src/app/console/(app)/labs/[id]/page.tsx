import type { Metadata } from "next";
import { Suspense } from "react";

import { LabDetail } from "@/features/console/components/lab-detail";

export const metadata: Metadata = { title: "Lab" };

export default function ConsoleLabPage({ params }: PageProps<"/console/labs/[id]">) {
  // The id is runtime data (Cache Components): resolve it behind Suspense.
  return (
    <Suspense>
      {params.then(({ id }) => (
        <LabDetail id={id} />
      ))}
    </Suspense>
  );
}
