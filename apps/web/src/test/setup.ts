// Runs before every test file (vitest.config.mts → setupFiles).
// Adds DOM matchers (toHaveAttribute, toBeEnabled…) and unmounts components
// after each test so one test's DOM never leaks into the next.
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
