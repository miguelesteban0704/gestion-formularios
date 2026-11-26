import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const dashboardPath = fileURLToPath(new URL("../src/pages/Dashboard.jsx", import.meta.url));
const publicStatsPath = fileURLToPath(new URL("../src/pages/admin/PublicStats.jsx", import.meta.url));
const entityFormsPath = fileURLToPath(new URL("../src/pages/entity-admin/EntityForms.jsx", import.meta.url));
const countsPath = fileURLToPath(new URL("../src/lib/formVisibilityCounts.js", import.meta.url));
const categoryBadgePath = fileURLToPath(new URL("../src/components/ui/CategoryBadge.jsx", import.meta.url));

test("counts every visibility category and treats legacy visibility as public", async () => {
  assert.ok(existsSync(countsPath), "the visibility count helper must exist");
  const { countFormVisibility } = await import("../src/lib/formVisibilityCounts.js");
  const forms = [
    { visibility: "public" },
    { visibility: "unlisted" },
    { visibility: "private" },
    { visibility: "private", isArchived: true },
    {},
  ];

  assert.deepEqual(countFormVisibility(forms), {
    public: 2,
    unlisted: 1,
    private: 1,
  });
});

test("role dashboards map each visibility category to its matching icon and count", () => {
  const dashboard = readFileSync(dashboardPath, "utf8");
  const publicStats = readFileSync(publicStatsPath, "utf8");
  const entityForms = readFileSync(entityFormsPath, "utf8");

  assert.match(dashboard, /icon=\{DoorOpenIcon\}\s+label=\{rt\("visibilityPublic"\)\}\s+value=\{counts\.visibility\.public\}/);
  assert.match(dashboard, /icon=\{Link2\}\s+label=\{rt\("linkOnlyOne"\)\}\s+value=\{counts\.visibility\.unlisted\}/);
  assert.match(dashboard, /icon=\{Lock\}\s+label=\{rt\("visibilityPrivate"\)\}\s+value=\{counts\.visibility\.private\}/);
  assert.match(dashboard, /icon=\{CheckCircle2\}\s+label=\{t\("published"\)\}\s+value=\{counts\.published\}/);

  assert.match(publicStats, /icon=\{DoorOpenIcon\}\s+label=\{rt\("visibilityPublic"\)\}\s+value=\{formatNumber\(safeTotals\.publicForms/);
  assert.match(publicStats, /icon=\{Link2\}\s+label=\{rt\("linkOnlyOne"\)\}\s+value=\{formatNumber\(safeTotals\.unlistedForms/);
  assert.match(publicStats, /icon=\{Lock\}\s+label=\{rt\("visibilityPrivate"\)\}\s+value=\{formatNumber\(safeTotals\.privateForms/);

  assert.match(entityForms, /icon=\{DoorOpenIcon\}\s+label=\{rt\("visibilityPublic"\)\}\s+value=\{formatNumber\(counts\.publics\)\}/);
  assert.match(entityForms, /icon=\{Link2\}\s+label=\{rt\("linkOnlyOne"\)\}\s+value=\{formatNumber\(counts\.unlisted\)\}/);
  assert.match(entityForms, /icon=\{Lock\}\s+label=\{rt\("visibilityPrivate"\)\}\s+value=\{formatNumber\(counts\.privates\)\}/);
});

test("visibility KPI cards no longer use public PNG icons", () => {
  const dashboard = readFileSync(dashboardPath, "utf8");
  const publicStats = readFileSync(publicStatsPath, "utf8");
  const entityForms = readFileSync(entityFormsPath, "utf8");

  for (const source of [dashboard, publicStats, entityForms]) {
    assert.doesNotMatch(source, /FormVisibilityIcon|(?:Public|Unlisted|Private)VisibilityIcon/);
  }
});

test("spotlight privacy visibility icons render with visible strokes", () => {
  const publicStats = readFileSync(publicStatsPath, "utf8");
  const categoryBadge = readFileSync(categoryBadgePath, "utf8");
  const lockIcon = categoryBadge.match(/function LockIcon[\s\S]*?\n\}/)?.[0];

  assert.match(publicStats, /icon:\s*<VisibilityIcon type=\{f\.visibility\}\s*\/>/);
  assert.match(categoryBadge, /unlisted:\s*\{\s*className:\s*"cat-unlisted",\s*icon:\s*Link2/);
  assert.match(lockIcon ?? "", /stroke="currentColor"/);
});

test("link-only badges and spotlight results reuse the filter's Link2 icon", () => {
  const categoryBadge = readFileSync(categoryBadgePath, "utf8");
  const publicStats = readFileSync(publicStatsPath, "utf8");

  assert.match(categoryBadge, /import\s+\{\s*Link2\s*\}\s+from\s+"lucide-react"/);
  assert.match(categoryBadge, /unlisted:\s*\{\s*className:\s*"cat-unlisted",\s*icon:\s*Link2/);
  assert.match(publicStats, /<Link2 className="h-3\.5 w-3\.5" aria-hidden="true" \/>/);
  assert.match(publicStats, /icon:\s*<VisibilityIcon type=\{f\.visibility\}\s*\/>/);
});
