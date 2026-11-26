import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const roleI18n = readFileSync(
  new URL("../src/lib/roleI18n.js", import.meta.url),
  "utf8",
);
const filteredFormsList = readFileSync(
  new URL("../src/components/forms/FilteredFormsList.jsx", import.meta.url),
  "utf8",
);

test("the authentication filter empty state uses accurate Spanish and English copy", () => {
  assert.match(
    filteredFormsList,
    /activeTab === "private"\s*\?\s*rt\("emptyAuthForms"\)/,
  );
  assert.match(roleI18n, /emptyAuthForms: "No forms requiring authentication are available yet\."/);
  assert.match(roleI18n, /emptyAuthForms: "Aún no hay formularios que requieran autenticación\."/);
});
