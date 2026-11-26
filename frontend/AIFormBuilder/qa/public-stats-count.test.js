import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const publicStats = readFileSync(
  new URL("../src/pages/admin/PublicStats.jsx", import.meta.url),
  "utf8",
);

test("publishedFormsCardMatchesTheFormsShownByTheSelectedFilter", () => {
  const publishedFormsTile = publicStats.match(
    /<StatTile\s+icon=\{FolderOpen\}[\s\S]*?\/>/,
  )?.[0];

  assert.ok(publishedFormsTile, "published forms summary tile exists");
  assert.match(
    publishedFormsTile,
    /value=\{formatNumber\(safeTotals\.forms\)\}/,
    "the published count must use the same filtered total as the table",
  );
  assert.doesNotMatch(
    publishedFormsTile,
    /safeTotals\.publicForms/,
    "the tile must not exclude published forms with restricted visibility",
  );
});

test("publicStatsKpiCardsUseOneBrandColor", () => {
  const tiles = [...publicStats.matchAll(/<StatTile[\s\S]*?\/>/g)].map((match) => match[0]);

  assert.equal(tiles.length, 6, "the public stats overview has six KPI cards");
  for (const tile of tiles) {
    assert.match(tile, /tone="accent"/, "every KPI card uses the same brand tone");
  }
});
