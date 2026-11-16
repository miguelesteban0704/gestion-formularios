/* Presentación de una respuesta guardada (bandeja de entrada y detalle).
 *
 * El texto que escribió la persona al elegir una opción «Otros» viaja como
 * `otherText` junto a la respuesta (propiedad hermana) o, en la clasificación
 * por escala (`importancia`), anidado dentro de cada fila del mapa de
 * puntuaciones: `{ [opciónId]: score | { value, otherText } }`.
 *
 * Las etiquetas de la opción «Otros» no son siempre «Otros»: según cómo la
 * escriba el autor o cómo la genere la IA puede ser «Otra», «Otras», «Otro»
 * u «Other». Todas se sustituyen por el texto real; el valor almacenado no
 * se modifica.
 */

const OTHER_LABELS = new Set(["otro", "otra", "otros", "otras", "other", "others"]);

function isOtherLabel(value) {
  return typeof value === "string" && OTHER_LABELS.has(value.trim().toLowerCase());
}

export function answerDisplay(answer) {
  if (!answer) return "";
  const value = answer.value;
  const otherText =
    typeof answer.otherText === "string" && answer.otherText.trim() !== ""
      ? answer.otherText.trim()
      : "";

  // Clasificación por escala: el text de «Otros» va anidado en una fila.
  if (answer.type === "importancia" && value !== null && typeof value === "object" && !Array.isArray(value)) {
    for (const key of Object.keys(value)) {
      const row = value[key];
      if (row !== null && typeof row === "object" && typeof row.otherText === "string" && row.otherText.trim()) {
        return row.otherText.trim();
      }
    }
    const parts = [];
    for (const key of Object.keys(value)) {
      const row = value[key];
      const score = row !== null && typeof row === "object" ? row.value ?? row.priority : row;
      if (Number.isInteger(score)) parts.push(`${key}: ${score}`);
    }
    return parts.join(", ");
  }

  if (otherText) {
    if (Array.isArray(value)) {
      let replaced = false;
      const parts = value.map((v) => {
        if (isOtherLabel(v)) {
          replaced = true;
          return otherText;
        }
        return String(v);
      });
      // Si la etiqueta guardada no era ninguna de las variantes conocidas de
      // «Otros», se añade el texto al final para no ocultar la respuesta real.
      if (!replaced) parts.push(otherText);
      return parts.join(", ");
    }
    return otherText;
  }

  if (value === undefined || value === null || value === "") return "";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}
