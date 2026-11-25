import { describe, expect, it } from "vitest";

import { codeSchema, createLabSchema, suggestSlug } from "./schemas";

describe("suggestSlug", () => {
  it.each([
    ["Tavnit Labs", "tavnit-labs"],
    ["  St. Jude's Diagnostic Laboratory, Ikeja ", "st-jude-s-diagnostic-laboratory-ikeja"],
    ["Clínica Médica", "clinica-medica"],
    ["---", ""],
  ])("%s → %s", (name, slug) => {
    expect(suggestSlug(name)).toBe(slug);
  });

  it("never exceeds 40 characters or ends with a hyphen", () => {
    const slug = suggestSlug("A very long laboratory name that keeps going and going on");
    expect(slug.length).toBeLessThanOrEqual(40);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("createLabSchema", () => {
  const valid = {
    name: "Tavnit Labs",
    slug: "tavnit",
    address: "",
    phone: "",
    email: "",
    legal_name: "",
    timezone: "Africa/Lagos",
    sections: ["chem_path"],
    manager_name: "Ifeoma Adeyemi",
    manager_email: "ifeoma@tavnit-labs.example",
  };

  it("turns empty optional fields into null", () => {
    const parsed = createLabSchema.parse(valid);
    expect(parsed.address).toBeNull();
    expect(parsed.email).toBeNull();
  });

  it.each([
    [{ slug: "Tavnit Labs" }, "slug"],
    [{ slug: "-tavnit" }, "slug"],
    [{ sections: [] }, "sections"],
    [{ manager_email: "ifeoma" }, "manager_email"],
  ])("rejects %o", (change, field) => {
    const result = createLabSchema.safeParse({ ...valid, ...change });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path[0]).toBe(field);
  });
});

describe("codeSchema", () => {
  it("accepts 6 digits with spaces", () => {
    expect(codeSchema.parse({ code: "123 456" }).code).toBe("123456");
  });
  it("rejects anything else", () => {
    expect(codeSchema.safeParse({ code: "12345" }).success).toBe(false);
    expect(codeSchema.safeParse({ code: "12a456" }).success).toBe(false);
  });
});
