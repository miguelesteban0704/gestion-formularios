/**
 * La misma semántica condicional del navegador (ver
 * frontend/src/lib/fieldTypes.js), para que el servidor valide lo mismo que
 * la persona vio: lo oculto no es obligatorio y lo no contestado no se guarda.
 *
 * Vive duplicada a propósito: el navegador no puede importar del backend y un
 * paquete compartido es más andamiaje que estas 40 líneas.
 */

export const CONDITIONAL_OPERATORS = ["equals", "not_equals", "includes", "not_includes"];

export function normAnswerText(v) {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function isQuestionVisible(question, answersById) {
  const cond = question?.visibleIf;
  if (!cond?.questionId) return true;
  const raw = answersById instanceof Map ? answersById.get(cond.questionId) : answersById?.[cond.questionId];
  const vals = Array.isArray(raw) ? raw : [raw];
  const filled = vals.filter((v) => v !== undefined && v !== null && v !== "");
  if (!filled.length) return false;
  const want = normAnswerText(cond.value);
  if (cond.operator === "includes") return filled.some((v) => normAnswerText(v) === want);
  if (cond.operator === "not_includes") return !filled.some((v) => normAnswerText(v) === want);
  if (cond.operator === "not_equals") return normAnswerText(filled[0]) !== want;
  return normAnswerText(filled[0]) === want;
}

export function isConsentDeclined(question, value) {
  if (!question?.isConsentGate) return false;
  const v = normAnswerText(value);
  return (
    v === "no" ||
    v.startsWith("no ") ||
    v.startsWith("no,") ||
    v.startsWith("no;") ||
    ["n", "false", "0", "nope"].includes(v)
  );
}
