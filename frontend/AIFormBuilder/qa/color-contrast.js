import { readFileSync } from "node:fs";
import { contrastRatio, parseThemeTokens } from "./color-contrast-utils.js";

const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");
const themes = parseThemeTokens(css);
const backgrounds = [
  ["appBg", "--app-bg"],
  ["surface", "--surface"],
  ["surface2", "--surface-2"],
];
const foregrounds = [
  ["fg", "--fg"],
  ["fgMuted", "--fg-muted"],
];
let failures = 0;

for (const [themeName, tokens] of Object.entries(themes)) {
  for (const [foreground, foregroundName] of foregrounds) {
    for (const [background, backgroundName] of backgrounds) {
      const ratio = contrastRatio(tokens[foreground], tokens[background]);
      const passes = ratio >= 4.5;
      console.log(
        `${passes ? "PASS" : "FAIL"} ${themeName} ${foregroundName}/${backgroundName}: ${ratio.toFixed(2)}:1 (4.5:1)`,
      );
      if (!passes) failures += 1;
    }
  }
}

console.log(`Contrast pairs: ${Object.keys(themes).length * foregrounds.length * backgrounds.length}; failures: ${failures}`);
if (failures > 0) process.exitCode = 1;
