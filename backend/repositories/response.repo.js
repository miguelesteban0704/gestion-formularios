import { query } from "../config/db.js";

export function mapResponse(row) {
  if (!row) return null;
  return {
    _id: row.id,
    form: row.form,
    answers: row.answers || [],
    completionTime: row.completion_time,
    meta: row.meta || {},
    submittedAt: row.submitted_at,
    respondentSub: row.respondent_sub || null,
    respondentName: row.respondent_name || null,
    respondentEmail: row.respondent_email || null,
    respondentUsername: row.respondent_username || null,
    isAnonymous: row.is_anonymous ?? true,
  };
}

export async function createResponse({ form, answers, completionTime, meta, respondentSub, respondentName, respondentEmail, respondentUsername }) {
  const { rows } = await query(
    `INSERT INTO responses (form, answers, completion_time, meta, respondent_sub, respondent_name, respondent_email, respondent_username, is_anonymous)
    VALUES ($1, $2::jsonb, $3, $4::jsonb, $5, $6, $7, $8, $9) RETURNING *`,
    [
      form,
      JSON.stringify(answers || []),
      completionTime || 0,
      JSON.stringify(meta || {}),
      respondentSub || null,
      respondentName || null,
      respondentEmail || null,
      respondentUsername || null,
      respondentSub ? false : true,
    ],
  );
  return mapResponse(rows[0]);
}

export async function insertManyResponses(docs) {
  if (!docs.length) return;
  const forms = docs.map((d) => d.form);
  const answers = docs.map((d) => JSON.stringify(d.answers || []));
  const times = docs.map((d) => d.completionTime || 0);
  const metas = docs.map((d) => JSON.stringify(d.meta || {}));
  const submitted = docs.map((d) =>
    d.submittedAt
      ? new Date(d.submittedAt).toISOString()
      : new Date().toISOString(),
  );

  await query(
    `INSERT INTO responses (form, answers, completion_time, meta, submitted_at)
    SELECT * FROM UNNEST(
      $1::uuid[], $2::jsonb[], $3::int[], $4::jsonb[], $5::timestamptz[]
    )`,
    [forms, answers, times, metas, submitted],
  );
}

export async function recentByForms(formIds, limit = 300) {
  if (!formIds.length) return [];
  const { rows } = await query(
    `SELECT * FROM responses WHERE form = ANY($1::uuid[])
    ORDER BY submitted_at DESC LIMIT $2`,
    [formIds, limit],
  );
  return rows.map(mapResponse);
}

export async function listResponsesByForm(formId) {
  const { rows } = await query(
    `SELECT * FROM responses WHERE form = $1 ORDER BY submitted_at DESC`,
    [formId],
  );
  return rows.map(mapResponse);
}

export async function findResponseById(id) {
  const { rows } = await query(`SELECT * FROM responses WHERE id = $1`, [id]);
  return mapResponse(rows[0]);
}

export async function deleteResponse(id) {
  await query(`DELETE FROM responses WHERE id = $1`, [id]);
}

export async function timelineByForms(formIds) {
  if (!formIds.length) return [];
  const { rows } = await query(
    `SELECT to_char(submitted_at, 'YYYY-MM-DD') AS date, COUNT(*)::int AS count
    FROM responses WHERE form = ANY($1::uuid[])
    GROUP BY date ORDER BY date`,
    [formIds],
  );
  return rows;
}

/**
 * Serie por formulario de los últimos días: día (YYYY-MM-DD), hora (0-23)
 * y total de respuestas. Alimenta el mini-histograma semanal y el kicker
 * "MIÉ · 8A" del tooltip de "Formularios destacados" con datos reales.
 */
export async function hourlyByForms(formIds, days = 14) {
  if (!formIds.length) return [];
  const { rows } = await query(
    `SELECT form,
      to_char(submitted_at, 'YYYY-MM-DD') AS date,
      EXTRACT(HOUR FROM submitted_at)::int AS hour,
      COUNT(*)::int AS count
    FROM responses
    WHERE form = ANY($1::uuid[]) AND submitted_at >= CURRENT_DATE - $2::int
    GROUP BY form, date, hour
    ORDER BY date, hour`,
    [formIds, days],
  );
  return rows;
}

export async function avgCompletionByForms(formIds) {
  if (!formIds.length) return 0;
  const { rows } = await query(
    `SELECT COALESCE(AVG(completion_time), 0)::float AS avg
    FROM responses WHERE form = ANY($1::uuid[])`,
    [formIds],
  );
  return Math.round(rows[0].avg || 0);
}

/**
 * Cuenta el total real de respuestas para un conjunto de formularios.
 * Fuente única de verdad — evita depender del contador desnormalizado
 * response_count de la tabla forms que puede desincronizarse.
 */
/**
 * Conteo real de respuestas por formulario (fuente única de verdad,
 * igual que countByForms pero agrupado por form).
 */
export async function countsByForms(formIds) {
  if (!formIds.length) return [];
  const { rows } = await query(
    `SELECT form, COUNT(*)::int AS count
    FROM responses WHERE form = ANY($1::uuid[])
    GROUP BY form`,
    [formIds],
  );
  return rows;
}

export async function countByForms(formIds) {
  if (!formIds.length) return 0;
  const { rows } = await query(
    `SELECT COUNT(*)::int AS total FROM responses WHERE form = ANY($1::uuid[])`,
    [formIds],
  );
  return rows[0].total || 0;
}

export async function heatmapByForms(formIds) {
  if (!formIds.length) return [];
  const { rows } = await query(
    `SELECT EXTRACT(DOW FROM submitted_at)::int AS day,
      EXTRACT(HOUR FROM submitted_at)::int AS hour,
      COUNT(*)::int AS count
    FROM responses WHERE form = ANY($1::uuid[])
    GROUP BY day, hour`,
    [formIds],
  );
  return rows;
}

export async function devicesByForms(formIds) {
  if (!formIds.length) return [];
  const { rows } = await query(
    `SELECT CASE
      WHEN meta->>'userAgent' ~ 'iPad|Tablet' THEN 'Tablet'
      WHEN meta->>'userAgent' ~ 'Android|iPhone|Mobile' THEN 'Mobile'
      ELSE 'Desktop'
    END AS label,
    COUNT(*)::int AS value
    FROM responses WHERE form = ANY($1::uuid[])
    GROUP BY label`,
    [formIds],
  );
  const order = { Desktop: 0, Mobile: 1, Tablet: 2 };
  return rows.sort((a, b) => (order[a.label] ?? 9) - (order[b.label] ?? 9));
}