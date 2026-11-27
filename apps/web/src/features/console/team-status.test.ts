import { describe, expect, it } from "vitest";

import type { TeamMember } from "./schemas";
import { teamStatus } from "./team-status";

const NOW = Date.parse("2026-11-27T12:00:00Z");
const base: TeamMember = {
  id: "0193b0a0-0000-7000-8000-000000000001",
  full_name: "Chidi Okafor",
  email: "chidi@platform.example",
  status: "invited",
  two_factor: false,
  last_login_at: null,
  created_at: "2026-11-27T10:00:00Z",
  invited_by_name: "Platform Admin",
  deactivated_at: null,
  invite_expires_at: "2026-11-30T10:00:00Z",
};

describe("teamStatus", () => {
  it("shows until when an open invite works", () => {
    expect(teamStatus(base, NOW)).toEqual({
      text: "Invited · link works until 30 Nov 2026",
      tone: "plain",
    });
  });

  it("flags an invite whose link has run out", () => {
    const expired = { ...base, invite_expires_at: "2026-11-26T10:00:00Z" };
    expect(teamStatus(expired, NOW)).toEqual({ text: "Invite expired", tone: "alert" });
    expect(teamStatus({ ...base, invite_expires_at: null }, NOW).tone).toBe("alert");
  });

  it("reads active and deactivated plainly", () => {
    expect(teamStatus({ ...base, status: "active" }, NOW).text).toBe("Active");
    expect(teamStatus({ ...base, status: "deactivated" }, NOW)).toEqual({
      text: "Deactivated",
      tone: "muted",
    });
  });
});
