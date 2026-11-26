import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const formsBrowser = readFileSync(
  new URL("../src/components/forms/FormsBrowser.jsx", import.meta.url),
  "utf8",
);

test("management forms retain exiting cards and animate incoming results", () => {
  assert.match(formsBrowser, /AnimatePresence/);
  assert.match(formsBrowser, /mode="popLayout"/);
  assert.match(formsBrowser, /visibleForms\.map/);
  assert.match(formsBrowser, /exit:\s*\{/);
});

test("filter animation avoids initial-load motion and respects reduced motion", () => {
  assert.match(formsBrowser, /initial=\{false\}/);
  assert.match(formsBrowser, /useReducedMotion/);
  assert.match(formsBrowser, /reduceMotion/);
  assert.match(formsBrowser, /duration = reduceMotion \? 0\.12 : 0\.18/);
  assert.match(formsBrowser, /translateY\(4px\)/);
  assert.match(formsBrowser, /Math\.min\(index \* 0\.03, 0\.12\)/);
});
