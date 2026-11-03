// Borrado de los formularios "sin titulo", con vuelta atras.
//
// Motivo de que sea un script y no un DELETE suelto: 3 de los 45 estan
// PUBLICADOS, con URL publica viva. Antes de borrar se vuelca cada fila
// completa (questions y settings incluidos) a un JSON, y el mismo archivo
// sabe restaurar. Sin eso, un "titulo sin tocar" equivocado es irrecuperable.
//
//   node qa/purge-untitled-forms.mjs            -> vuelca y borra
//   node qa/purge-untitled-forms.mjs --dry      -> solo el informe
//   node qa/purge-untitled-forms.mjs --restore <backup.json>
import "dotenv/config";
import { query, pool } from "../config/db.js";

/* El grupo real es el titulo que pone la app al crear un formulario en blanco
   (LanguageContext `untitledForm`, "Formulario sin titulo" en ES). Se anaden los
   nombres que podria haber dejado el default de la columna y los titulos vacios:
   hoy no hay ninguno, pero si lo hubiera entraria en el mismo borrado sin que
   nadie se acuerde de el. */
/* Dos formas del mismo filtro: una calificada con `f.` para las consultas que
   hacen JOIN (allí `title` es ambiguo) y otra suelta para las que no. */
const PRED_LIBRE =
  `title = 'Formulario sin título'
    OR title = 'Untitled form'
    OR btrim(title) = ''`;
const PRED = PRED_LIBRE.replace(/\btitle\b/g, "f.title");

const argv = process.argv.slice(2);
const dry = argv.includes("--dry");
const restoreAt = argv.indexOf("--restore");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");

// ── Restauro ────────────────────────────────────────────────────────────────
if (restoreAt > -1) {
  const file = argv[restoreAt + 1];
  if (!file) {
    console.error("Falta la ruta del backup: --restore <backup.json>");
    process.exit(1);
  }
  const { readFileSync } = await import("node:fs");
  const filas = JSON.parse(readFileSync(file, "utf8"));
  console.log(`Restaurando ${filas.length} formularios desde ${file}`);

  const client = await pool.connect();
  let ok = 0;
  try {
    await client.query("BEGIN");
    for (const f of filas) {
      await client.query(
        `INSERT INTO forms
           (id, owner, title, description, theme, status, slug, questions, settings,
            views, response_count, is_favorite, is_archived, published_at,
            creation_source, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$11,$12,$13,$14::jsonb,$15,$16,$17)
         ON CONFLICT (id) DO NOTHING`,
        [f.id, f.owner, f.title, f.description, f.theme, f.status, f.slug,
         JSON.stringify(f.questions), JSON.stringify(f.settings),
         f.views, f.response_count, f.is_favorite, f.is_archived, f.published_at,
         f.creation_source, f.created_at, f.updated_at],
      );
      ok++;
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("FALLO, no se restoring nada:", e.message);
    process.exit(1);
  } finally {
    client.release();
  }
  console.log(`OK  ${ok} formularios restaurados.`);
  await pool.end();
  process.exit(0);
}

// ── Informe ─────────────────────────────────────────────────────────────────
const det = await query(`
  SELECT f.status, coalesce(u.email,'(sin email)') AS email,
         count(*)::int AS n,
         coalesce(sum(f.views),0)::int AS vistas,
         coalesce(sum(f.response_count),0)::int AS respuestas
  FROM forms f LEFT JOIN users u ON u.id = f.owner
  WHERE ${PRED}
  GROUP BY f.status, u.email ORDER BY n DESC
`);

const desglose = await query(`
  SELECT
    count(*) FILTER (WHERE title = 'Formulario sin título')::int AS titulo_app,
    count(*) FILTER (WHERE title = 'Untitled form')::int          AS default_columna,
    count(*) FILTER (WHERE btrim(title) = '')::int                AS vacios
  FROM forms WHERE ${PRED_LIBRE}
`);

const huerfanas = await query(`
  SELECT
    (SELECT count(*)::int FROM responses r JOIN forms f ON f.id = r.form WHERE ${PRED}) AS respuestas,
    (SELECT count(*)::int FROM notifications n JOIN forms f ON f.id = n.form_id WHERE ${PRED}) AS notificaciones
`);

const total = await query("SELECT count(*)::int AS total FROM forms");

console.log("— A BORRAR —");
console.table(det.rows);
console.log("— Por criterio —");
console.table(desglose.rows);
console.log("— Cascada —");
console.table(huerfanas.rows);
console.log("Formularios ahora:", total.rows[0].total, "-> despues:",
  total.rows[0].total - det.rows.reduce((s, r) => s + r.n, 0));

if (dry) {
  console.log("\n--dry: no se ha borrado nada.");
  await pool.end();
  process.exit(0);
}

// ── Vuelcada ────────────────────────────────────────────────────────────────
const filas = (await query(`
  SELECT id, owner, title, description, theme, status, slug, questions, settings,
         views, response_count, is_favorite, is_archived, published_at,
         creation_source, created_at, updated_at
  FROM forms WHERE ${PRED_LIBRE} ORDER BY created_at
`)).rows;

const { writeFileSync } = await import("node:fs");
const backup = `qa/untitled-backup-${stamp}.json`;
writeFileSync(backup, JSON.stringify(filas, null, 2));
console.log(`\nBackup escrito: ${backup}  (${filas.length} filas)`);

// ── Borrado ─────────────────────────────────────────────────────────────────
const client = await pool.connect();
try {
  await client.query("BEGIN");
  const r = await client.query(`DELETE FROM forms WHERE ${PRED_LIBRE}`);
  await client.query("COMMIT");
  console.log(`OK  ${r.rowCount} formularios borrados.`);
} catch (e) {
  await client.query("ROLLBACK");
  console.error("FALLO, rollback hecho, no se borro nada:", e.message);
  process.exit(1);
} finally {
  client.release();
}

const quedan = await query(`
  SELECT count(*)::int AS sin_titulo,
         (SELECT count(*)::int FROM forms) AS total
  FROM forms WHERE ${PRED_LIBRE}
`);
console.table(quedan.rows);
console.log(`Para deshacer:  node qa/purge-untitled-forms.mjs --restore ${backup}`);

await pool.end();
