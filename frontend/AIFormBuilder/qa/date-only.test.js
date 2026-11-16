import assert from "node:assert/strict";
import test from "node:test";
import { parseDateOnly } from "../src/lib/utils.js";

/* Regresión del día que no coincide:
   `new Date("2026-11-13")` es medianoche UTC; en Cuba cae el 12 a las 19:00 y
   `getDay()` devuelve jueves. El gráfico «Días con más actividad» y el «Mejor
   día» del tooltip usan fechas `YYYY-MM-DD`, así que deben parsearse a mediodía
   LOCAL. */

test("parseDateOnly_conservaElDiaYElDiaDeLaSemana", () => {
  const viernes = parseDateOnly("2026-11-13");
  assert.equal(viernes.getFullYear(), 2026);
  assert.equal(viernes.getMonth(), 10); // noviembre
  assert.equal(viernes.getDate(), 13);
  assert.equal(viernes.getDay(), 5); // viernes

  const domingo = parseDateOnly("2026-11-15");
  assert.equal(domingo.getDate(), 15);
  assert.equal(domingo.getDay(), 0); // domingo

  const lunes = parseDateOnly("2026-11-16");
  assert.equal(lunes.getDate(), 16);
  assert.equal(lunes.getDay(), 1); // lunes
});

test("elDiaConMasActividadCoincideConElDiaDelPicoReal", () => {
  // Los tres días de la encuesta de ejemplo: vie 4, dom 1, lun 3.
  const timeline = [
    { date: "2026-11-13", count: 4 },
    { date: "2026-11-15", count: 1 },
    { date: "2026-11-16", count: 3 },
  ];
  const counts = Array(7).fill(0);
  for (const entry of timeline) {
    counts[parseDateOnly(entry.date).getDay()] += entry.count;
  }
  const peak = counts.indexOf(Math.max(...counts));
  assert.equal(peak, 5, "el pico debe caer en viernes");
  assert.equal(peak, parseDateOnly("2026-11-13").getDay(), "el día del pico real es viernes");
});

test("parseDateOnly_toleraFechasConHoraOInvalidas", () => {
  assert.equal(parseDateOnly("2026-11-13T23:30:00.000Z").getDate(), 13);
  assert.equal(Number.isNaN(parseDateOnly("").getTime()), true);
});
