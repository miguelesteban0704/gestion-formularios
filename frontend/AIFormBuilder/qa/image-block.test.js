import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const fieldSettings = readFileSync(
  new URL("../src/components/builder/FieldSettings.jsx", import.meta.url),
  "utf8",
);
const sortableField = readFileSync(
  new URL("../src/components/builder/SortableField.jsx", import.meta.url),
  "utf8",
);

test("builder image block has one preview and a remove action on the canvas", () => {
  assert.doesNotMatch(fieldSettings, /<img\b/, "the settings panel must not duplicate the canvas preview");
  assert.match(sortableField, /<FieldRenderer field=\{translatedField\}/);
  assert.match(sortableField, /field\.type === "image" && field\.content/);
  assert.match(sortableField, /onChange\(\{\s*\.\.\.field,\s*content:\s*""\s*\}\)/);
});
