import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

// DESIGN.md guardrail: colours only through tokens. Colour values live in
// src/styles/tokens.css; app code (TS/TSX) may not contain any.
const HEX = String.raw`#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b`;
const COLOR_FN = String.raw`\b(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb|color-mix)\(`;
const COLOUR_UTILITY = String.raw`(?:bg|text|border(?:-[trblxyse])?|ring|ring-offset|outline|fill|stroke|decoration|accent|caret|divide|placeholder|from|via|to|shadow)`;
const ARBITRARY_COLOR = String.raw`\b${COLOUR_UTILITY}-\[(?:#|(?:rgba?|hsla?|oklch|oklab|color|var)\b)`;
const COLOUR_MESSAGE =
  "No raw colours in app code. Use the Tailwind tokens from DESIGN.md (bg-surface, text-ink, text-eosin-text…).";

const noRawColours = ["Literal", "TemplateElement"].flatMap((node) => {
  const field = node === "Literal" ? "value" : "value.raw";
  return [HEX, COLOR_FN, ARBITRARY_COLOR].map((pattern) => ({
    selector: `${node}[${field}=/${pattern}/]`,
    message: COLOUR_MESSAGE,
  }));
});

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": ["error", ...noRawColours],
    },
  },
  // Last: turns off ESLint style rules that Prettier owns, so they never fight.
  prettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Playwright output
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
