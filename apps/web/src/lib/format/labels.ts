import type { Role, Section } from "@/features/auth/schemas";

/** Words people see for API enum values. One place, so every screen says the same. */
export const roleLabels: Record<Role, string> = {
  manager: "Manager",
  chief_scientist: "Chief Scientist",
  lab_scientist: "Lab Scientist",
  front_desk: "Front Desk",
};

export const sectionLabels: Record<Section, string> = {
  chem_path: "Chemical Pathology",
  haematology: "Haematology",
  microbiology: "Medical Microbiology",
};

/** "Good morning" etc. by the hour in the LAB's timezone, not the device's. */
export function greeting(timezone: string, now: Date = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: timezone })
      .formatToParts(now)
      .find((part) => part.type === "hour")?.value ?? "12",
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}
