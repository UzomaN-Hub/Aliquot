import type { Metadata } from "next";
import { Suspense } from "react";

import { TeamMember } from "@/features/console/components/team-member";

export const metadata: Metadata = { title: "Super-admin" };

export default function ConsoleTeamMemberPage({ params }: PageProps<"/console/team/[id]">) {
  // The id is runtime data (Cache Components): resolve it behind Suspense.
  return (
    <Suspense>
      {params.then(({ id }) => (
        <TeamMember id={id} />
      ))}
    </Suspense>
  );
}
