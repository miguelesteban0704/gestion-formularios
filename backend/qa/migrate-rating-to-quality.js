/**
 * Migración única (idempotente): en TODOS los formularios publicados, las
 * preguntas `rating` que hoy se pintan como estrellas de un solo color
 * pasan a `quality_rating` (estrellas por puesto: 1-2 rojo, 3 ámbar, 4+
 * verde), el diseño del constructor.
 *
 * Regla de elegibilidad = la misma condición con la que el renderer decide
 * estrellas (`conEstrellas` en FieldRenderer + `scaleOf` en fieldTypes):
 * exactamente 5 pasos y sin rótulos en los extremos. Las Likert con anclas
 * u otra longitud se quedan como `rating` neutro (no se juzga la opinión).
 *
 * Los valores guardados son numéricos en los tres tipos y la analítica los
 * promedia igual (RATING_TYPES), así que las respuestas existentes no se
 * tocan. Uso: `node qa/migrate-rating-to-quality.js`.
 */
import { query } from "../config/db.js";

const DEFAULT_SCALE = { min: 1, max: 5, minLabel: "", maxLabel: "" };
const MIN_SCALE_STEPS = 2;

function scaleOf(field) {
  const s = field?.scale;
  if (!s || typeof s !== "object") return DEFAULT_SCALE;
  const min = Number(s.min);
  const max = Number(s.max);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return DEFAULT_SCALE;
  if (max - min + 1 < MIN_SCALE_STEPS) return DEFAULT_SCALE;
  return { min, max, minLabel: String(s.minLabel ?? ""), maxLabel: String(s.maxLabel ?? "") };
}

function starEligible(q) {
  if (String(q?.type ?? "").toLowerCase() !== "rating") return false;
  const s = scaleOf(q);
  return s.max - s.min + 1 === 5 && !s.minLabel && !s.maxLabel;
}

const { rows: forms } = await query(
  "SELECT id, title, slug, visibility, questions FROM forms WHERE status = 'published' ORDER BY created_at DESC"
);

let formsTouched = 0;
let questionsMigrated = 0;
let questionsKept = 0;
for (const f of forms) {
  const questions = Array.isArray(f.questions) ? f.questions : [];
  let changed = false;
  const detail = [];
  for (const q of questions) {
    if (String(q?.type ?? "").toLowerCase() !== "rating") continue;
    if (starEligible(q)) {
      q.type = "quality_rating";
      changed = true;
      questionsMigrated++;
      detail.push(`"${q.label ?? q.id ?? "?"}" -> quality_rating`);
    } else {
      questionsKept++;
      detail.push(`"${q.label ?? q.id ?? "?"}" SE QUEDA (no es 5 pts sin anclas)`);
    }
  }
  if (changed) {
    await query("UPDATE forms SET questions = $1::jsonb, updated_at = now() WHERE id = $2", [
      JSON.stringify(questions),
      f.id,
    ]);
    formsTouched++;
  }
  const hits = detail.length ? ` | ${detail.join(" ; ")}` : "";
  console.log(`- ${f.title} [${f.visibility}] slug=${f.slug}${hits}`);
}
console.log(`\nMIGRADOS: ${questionsMigrated} preguntas en ${formsTouched} formularios · CONSERVADOS: ${questionsKept}`);
process.exit(0);
