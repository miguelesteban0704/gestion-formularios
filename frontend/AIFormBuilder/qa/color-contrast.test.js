import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  ACCENTS,
  applyAccent,
  buildAccentScale,
  checkOnAccent,
  resetAccent,
} from "../src/lib/accent.js";
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

test("builder image upload follows the form accent and falls back to the live brand token", () => {
  const imageUpload = readFileSync(
    new URL("../src/components/builder/ImageUpload.jsx", import.meta.url),
    "utf8",
  );
  const fieldSettings = readFileSync(
    new URL("../src/components/builder/FieldSettings.jsx", import.meta.url),
    "utf8",
  );
  const sortableField = readFileSync(
    new URL("../src/components/builder/SortableField.jsx", import.meta.url),
    "utf8",
  );

  assert.match(imageUpload, /const resolvedAccent = accent \|\| "var\(--color-brand-500\)";/);
  assert.match(sortableField, /<FieldSettings[^>]*accent=\{accent\}/);
  assert.match(fieldSettings, /<ImageUpload[\s\S]*?accent=\{accent\}/);
});

test("configured accent foregrounds reach WCAG AA for preset and custom colors", () => {
  for (const { value } of [...ACCENTS, { value: "#777777" }]) {
    const foreground = checkOnAccent(value);
    const ratio = contrastRatio(foreground, value);
    assert.ok(
      ratio >= 4.5,
      `${foreground} on ${value} is ${ratio.toFixed(2)}:1; expected >= 4.5:1`,
    );
  }
});

test("primary button uses the contrast-aware ink across its configurable gradient", () => {
  const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");
  const start = css.indexOf("@utility btn-primary {");
  assert.notEqual(start, -1, "the shared primary button utility exists");
  const end = css.indexOf("\n@utility ", start + 1);
  const rule = css.slice(start, end === -1 ? css.length : end);

  assert.match(rule, /var\(--color-brand-gradient-start\)/);
  assert.match(rule, /var\(--color-brand-500\)/);
  assert.match(rule, /var\(--color-brand-gradient-end\)/);
  assert.match(rule, /color:\s*var\(--color-on-brand-gradient\);/);

  for (const { value } of [...ACCENTS, { value: "#777777" }]) {
    const scale = buildAccentScale(value.toLowerCase());
    const ink = checkOnAccent(scale["500"]);
    const endShade = ink === "#000000" ? scale["400"] : scale["600"];
    for (const color of [scale["500"], endShade]) {
      assert.ok(
        contrastRatio(ink, color) >= 4.5,
        `primary button ink on ${color} for ${value} must reach 4.5:1`,
      );
    }
  }
});

test("dashboard card arrow uses a contrasting ink on every card accent", () => {
  const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");
  const start = css.indexOf("@utility card-arrow-on {");
  assert.notEqual(start, -1, "the dashboard card hover utility exists");
  const end = css.indexOf("\n@utility ", start + 1);
  const rule = css.slice(start, end === -1 ? css.length : end);
  assert.match(rule, /color:\s*#000000;/);

  for (const name of ["gold", "coral", "purple", "blue", "teal"]) {
    const match = css.match(new RegExp(`--accent-${name}:\\s*(#[0-9a-fA-F]{6})`));
    assert.ok(match, `${name} card accent is declared`);
    const ratio = contrastRatio("#000000", match[1]);
    assert.ok(ratio >= 3, `black on ${name} is ${ratio.toFixed(2)}:1; expected >= 3:1`);
  }
});

test("public form and image upload apply contrast-aware accent text", () => {
  const formView = readFileSync(
    new URL("../src/components/public/FormView.jsx", import.meta.url),
    "utf8",
  );
  const imageUpload = readFileSync(
    new URL("../src/components/builder/ImageUpload.jsx", import.meta.url),
    "utf8",
  );

  assert.match(formView, /const accentInk = checkOnAccent\(accent\);/);
  assert.match(formView, /color:\s*accentInk/);
  assert.match(imageUpload, /const accentInk = checkOnAccent\(contrastAccent\);/);
  assert.match(imageUpload, /color:\s*mode === "upload" \? accentInk : undefined/);
  assert.match(imageUpload, /color:\s*mode === "url" \? accentInk : undefined/);
});

test("applying an accent sets readable ink for every brand shade and gradient", () => {
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const properties = new Map();
  const documentRoot = {
    style: {
      setProperty: (name, value) => properties.set(name, value),
      removeProperty: (name) => properties.delete(name),
    },
  };

  globalThis.window = {};
  globalThis.document = { documentElement: documentRoot };

  try {
    const accent = "#FF007F";
    const scale = buildAccentScale(accent.toLowerCase());
    applyAccent(accent);

    for (const [step, color] of Object.entries(scale)) {
      const ink = properties.get(`--color-on-brand-${step}`);
      assert.equal(ink, checkOnAccent(color), `brand ${step} uses its contrasting ink`);
      assert.ok(contrastRatio(ink, color) >= 4.5, `brand ${step} ink reaches 4.5:1`);
    }

    const gradientInk = properties.get("--color-on-brand-gradient");
    const gradientStart = properties.get("--color-brand-gradient-start");
    const gradientEnd = properties.get("--color-brand-gradient-end");
    assert.equal(gradientStart, scale["500"]);
    assert.equal(
      gradientEnd,
      gradientInk === "#000000" ? scale["400"] : scale["600"],
    );
    for (const color of [gradientStart, gradientEnd]) {
      assert.ok(
        contrastRatio(gradientInk, color) >= 4.5,
        `brand gradient ink reaches 4.5:1 on ${color}`,
      );
    }

    resetAccent();
    for (const step of Object.keys(scale)) {
      assert.equal(properties.has(`--color-on-brand-${step}`), false);
    }
    assert.equal(properties.has("--color-on-brand-gradient"), false);
    assert.equal(properties.has("--color-brand-gradient-start"), false);
    assert.equal(properties.has("--color-brand-gradient-end"), false);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});
