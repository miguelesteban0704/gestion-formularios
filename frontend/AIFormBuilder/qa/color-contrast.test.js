import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  compositeOver,
  contrastRatio,
  parseThemeTokens,
  relativeLuminance,
} from "./color-contrast-utils.js";

const themeCss = `
:root {
  --app-bg: #fbfcfe;
  --surface: #ffffff;
  --surface-2: #f8fafc;
  --fg: #0f172a;
  --fg-muted: #64748b;
}
.dark {
  --app-bg: #0a0c12;
  --surface: #12151d;
  --surface-2: #171b25;
  --fg: #e9edf4;
  --fg-muted: #8a93a6;
}
`;

test("relative luminance uses WCAG sRGB linearization", () => {
  assert.equal(relativeLuminance("#000000"), 0);
  assert.equal(relativeLuminance("#ffffff"), 1);
});

test("contrast ratio returns 21:1 for black on white", () => {
  assert.equal(contrastRatio("#000000", "#ffffff"), 21);
});

test("contrast ratio returns 1:1 for identical colors", () => {
  assert.equal(contrastRatio("#777777", "#777777"), 1);
});

test("composites a half-transparent black over white as #808080", () => {
  assert.equal(compositeOver("#000000", "#ffffff", 0.5), "#808080");
});

test("parses semantic tokens from light and dark theme rules", () => {
  assert.deepEqual(parseThemeTokens(themeCss), {
    light: {
      appBg: "#fbfcfe",
      surface: "#ffffff",
      surface2: "#f8fafc",
      fg: "#0f172a",
      fgMuted: "#64748b",
    },
    dark: {
      appBg: "#0a0c12",
      surface: "#12151d",
      surface2: "#171b25",
      fg: "#e9edf4",
      fgMuted: "#8a93a6",
    },
  });
});

test("rejects a theme missing a required semantic token", () => {
  assert.throws(() => parseThemeTokens(":root { --app-bg: #ffffff; } .dark {}"), /--surface/);
});

test("current semantic text tokens meet 4.5:1 on all declared theme surfaces", () => {
  const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");
  const themes = parseThemeTokens(css);
  const backgrounds = ["appBg", "surface", "surface2"];
  const foregrounds = ["fg", "fgMuted"];

  for (const [themeName, tokens] of Object.entries(themes)) {
    for (const foreground of foregrounds) {
      for (const background of backgrounds) {
        const ratio = contrastRatio(tokens[foreground], tokens[background]);
        assert.ok(
          ratio >= 4.5,
          `${themeName} ${foreground}/${background} is ${ratio.toFixed(2)}:1; expected >= 4.5:1`,
        );
      }
    }
  }
});

test("keyboard focus keeps the brand ring and adds a high-contrast outer outline", () => {
  const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");
  const start = css.indexOf("@utility btn-focus {");
  assert.notEqual(start, -1, "the shared button focus utility exists");
  const end = css.indexOf("\n@utility ", start + 1);
  const rule = css.slice(start, end === -1 ? css.length : end);
  assert.match(
    rule,
    /&:focus-visible\s*\{[\s\S]*outline:\s*2px solid var\(--fg\);[\s\S]*outline-offset:\s*4px;/,
  );

  const themes = parseThemeTokens(css);
  for (const [themeName, tokens] of Object.entries(themes)) {
    for (const background of ["appBg", "surface", "surface2"]) {
      assert.ok(
        contrastRatio(tokens.fg, tokens[background]) >= 3,
        `${themeName} focus outline must reach 3:1 against ${background}`,
      );
    }
  }
});
