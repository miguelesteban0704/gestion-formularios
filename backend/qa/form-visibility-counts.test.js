import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const countsPath = fileURLToPath(
  new URL("../utils/formVisibilityCounts.js", import.meta.url),
);
const adminController = readFileSync(
  new URL("../controllers/admin.controller.js", import.meta.url),
  "utf8",
);

test("counts public, link-only, and authentication-required forms separately", async () => {
  assert.ok(existsSync(countsPath), "the visibility count helper must exist");
  const { countFormVisibility } = await import("../utils/formVisibilityCounts.js");
  const forms = [
    { visibility: "public" },
    { visibility: "unlisted" },
    { visibility: "private" },
    { visibility: "unlisted" },
  ];

  assert.deepEqual(countFormVisibility(forms), {
    public: 1,
    unlisted: 2,
    private: 1,
  });
});

test("superadmin aggregate exposes the three visibility totals", () => {
  assert.match(adminController, /countFormVisibility\(all\)/);
  assert.match(adminController, /publicForms:\s*visibilityCounts\.public/);
  assert.match(adminController, /unlistedForms:\s*visibilityCounts\.unlisted/);
  assert.match(adminController, /privateForms:\s*visibilityCounts\.private/);
});

test("published forms total includes every visibility category despite the active filter", () => {
  const totals = adminController.match(/const totals = \{([\s\S]*?)\n  \};/)?.[1];

  assert.ok(totals, "the superadmin aggregate totals exist");
  assert.match(totals, /forms:\s*all\.length/);
});
