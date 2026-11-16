import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const chronoSelect = readFileSync(
  new URL("../src/components/ui/ChronoSelect.jsx", import.meta.url),
  "utf8",
);
const premiumSelect = readFileSync(
  new URL("../src/components/ui/PremiumSelect.jsx", import.meta.url),
  "utf8",
);

test("chronoSelect_keepsSearchInputMountedWithoutMatches", () => {
  // Regresión: el buscador se renderizaba con `searchable && filtered.length > 0`.
  // Al no encontrar coincidencias el input desaparecía y la persona no podía
  // borrar la búsqueda sin cerrar y reabrir el select.
  assert.doesNotMatch(
    chronoSelect,
    /searchable\s*&&\s*filtered\.length\s*>\s*0/,
    "el buscador no debe condicionarse a que existan coincidencias",
  );

  const searchInputs = chronoSelect.match(/\{searchable \? \(/g) ?? [];
  assert.equal(
    searchInputs.length,
    2,
    "las dos ramas del desplegable (con y sin tooltip) deben montar el buscador",
  );
});

test("chronoSelect_searchIsControlledSoClearingRestoresOptions", () => {
  assert.match(chronoSelect, /value=\{query\}/);
  assert.match(chronoSelect, /onChange=\{\(e\) => setQuery\(e\.target\.value\)\}/);
  assert.match(chronoSelect, /if \(!query\) return true;/);
});

test("premiumSelect_keepsSearchInputMountedWithoutMatches", () => {
  assert.doesNotMatch(
    premiumSelect,
    /searchable\s*&&\s*filtered\.length\s*>\s*0/,
    "el buscador no debe condicionarse a que existan coincidencias",
  );

  const searchInputs = premiumSelect.match(/\{searchable && \(/g) ?? [];
  assert.equal(
    searchInputs.length,
    2,
    "las dos ramas del desplegable (con y sin tooltip) deben montar el buscador",
  );
});
