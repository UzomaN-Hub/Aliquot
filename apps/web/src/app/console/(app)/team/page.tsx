import type { Metadata } from "next";

import { TeamList } from "@/features/console/components/team-list";

export const metadata: Metadata = { title: "Platform team" };

export default function ConsoleTeamPage() {
  return <TeamList />;
}
