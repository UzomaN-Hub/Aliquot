import { describe, expect, it } from "vitest";

import { parseServerConfig } from "./config";

const valid = {
  PLATFORM_NAME: "Test Platform",
  PLATFORM_DOMAIN: "localhost",
  TENANT_MODE: "path",
  API_URL: "http://localhost:8000/",
};

describe("parseServerConfig", () => {
  it("accepts a complete environment and trims the API URL's trailing slash", () => {
    expect(parseServerConfig(valid)).toEqual({
      ...valid,
      API_URL: "http://localhost:8000",
      STYLEGUIDE_ENABLED: false,
    });
  });

  it("turns the styleguide on only for the exact string true", () => {
    expect(parseServerConfig({ ...valid, STYLEGUIDE_ENABLED: "true" }).STYLEGUIDE_ENABLED).toBe(
      true,
    );
    expect(() => parseServerConfig({ ...valid, STYLEGUIDE_ENABLED: "yes" })).toThrow(
      "STYLEGUIDE_ENABLED",
    );
  });

  it("names every missing variable", () => {
    expect(() => parseServerConfig({})).toThrow(
      "Invalid or missing environment variables: PLATFORM_NAME, PLATFORM_DOMAIN, TENANT_MODE, API_URL",
    );
  });

  it("rejects an unknown tenant mode", () => {
    expect(() => parseServerConfig({ ...valid, TENANT_MODE: "domain" })).toThrow("TENANT_MODE");
  });
});
