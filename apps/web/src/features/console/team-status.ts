import { formatDate } from "@/lib/format/dates";

import type { TeamMember } from "./schemas";

export type TeamStatus = { text: string; tone: "plain" | "muted" | "alert" };

/** How a super-admin's state reads in the team list and on their profile. */
export function teamStatus(member: TeamMember, now: number = Date.now()): TeamStatus {
  if (member.status === "active") return { text: "Active", tone: "plain" };
  if (member.status === "deactivated") return { text: "Deactivated", tone: "muted" };
  const expires = member.invite_expires_at;
  if (expires && new Date(expires).getTime() > now) {
    return { text: `Invited · link works until ${formatDate(expires)}`, tone: "plain" };
  }
  return { text: "Invite expired", tone: "alert" };
}
