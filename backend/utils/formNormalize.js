/**
 * Pasa lo que devuelve el modelo a la forma interna de una pregunta.
 *
 * Vive aparte de services/ai.service.js a propósito: sin dependencias de red,
 * para poder ejercitarlo con los casos reales que devolvió el proveedor
 * (ver qa/ai-options.js en el frontend).
 */

import { nanoid } from "./nanoid.js";
import { FIELD_TYPES, OPTION_FIELD_TYPES, STATIC_FIELD_TYPES, RATING_TYPES, catalogTypeFor } from "./constants.js";
import { coerceOptionLabels } from "./optionLabels.js";
import { CONDITIONAL_OPERATORS } from "./visibility.js";

const VALID_THEMES = ["minimal", "modern", "corporate", "gradient", "dark", "glassmorphism"];

/**
 * Sinónimos que el modelo usa cuando ignora la lista de tipos del prompt.
 * Mapearlos es mejor que dejar que caigan en short_text: si pide "select"
 * quiere un desplegable, y un desplegable con su lista de opciones se puede
 * arreglar; un campo de texto ya no dice lo que el autor quería.
 */
const TYPE_ALIASES = {
  text: "short_text",
  textarea: "long_text",
  longtext: "long_text",
  email_address: "email",
  telephone: "phone",
  tel: "phone",
  integer: "number",
  url_link: "url",
  select: "dropdown",
  select_question: "dropdown",
  dropdown_question: "dropdown",
  combo: "dropdown",
  multi_choice: "radio",
  multiple_choice: "radio",
  single_choice: "radio",
  choice: "radio",
  checkbox_group: "checkbox",
  checkboxes: "checkbox",
  casillas: "checkbox",
  datepicker: "date",
  date_picker: "date",
  boolean: "yes_no",
  yesno: "yes_no",
  /* Calidad con estrellas y puntaje numérico: lo que antes caía en `rating`
     genérico ahora tiene tipo propio para poder pintarse con semáforo
     (rojo/ámbar/verde) sin juzgar las escalas de opinión, que siguen neutras. */
  star_rating: "quality_rating",
  quality: "quality_rating",
  quality_stars: "quality_rating",
  stars: "quality_rating",
  calidad: "quality_rating",
  estrellas: "quality_rating",
  score: "score_rating",
  numeric: "score_rating",
  numeric_rating: "score_rating",
  quantity_rating: "score_rating",
  score_scale: "score_rating",
  puntaje: "score_rating",
  puntuacion: "score_rating",
  nps: "score_rating",
  time_picker: "time",
  hora: "time",
  /* Preguntas de clasificación ("ordene de 1 a 5 las medidas más importantes").
     Sin esto caían en short_text: el modelo pedía un orden y se guardaba una
     caja de texto, que no es lo mismo que no tener nada — es peor, porque
     parece que la pregunta está puesta y en realidad nadie puede contestar. */
  ranking: "rank",
  rank_question: "rank",
  rank_choices: "rank",
  order: "rank",
  ordering: "rank",
  priority: "rank",
  ordenar: "rank",
  orden: "rank",
  clasificacion: "rank",
  priorizacion: "rank",
  prioridad: "rank",
  scale: "score_rating",
  likert: "score_rating",
  likert_scale: "score_rating",
  satisfaction_scale: "score_rating",
};

function resolveType(rawType, label = "") {
  if (typeof rawType !== "string") return "short_text";
  const t = rawType.trim().toLowerCase().replace(/[\s-]+/g, "_");
  const tipo = FIELD_TYPES.includes(t) ? t : TYPE_ALIASES[t] || "short_text";

  /* Un desplegable llamado "Provincia" no es un desplegable: es el campo de
     provincia que ya trae el constructor, con la lista real de provincias. El
     modelo lo devuelve con el tipo genérico (o con "select") y sus propias
     opciones inventadas; aquí se cambia por el tipo diseñado para que el
     formulario generado use los mismos campos que el autor arrastra a mano.
     Solo se cambia el tipo: las opciones inventadas quedan en el campo y el
     render las ignora, porque el catálogo las pone la aplicación. */
  if (tipo === "dropdown" || tipo === "radio") {
    const catalogo = catalogTypeFor(label);
    if (catalogo) return catalogo;
  }
  return tipo;
}

/**
 * Escala de un `rating`. Por defecto 1 a 5, que es lo que se ha visto siempre.
 *
 * Antes no existia: el campo `rating` pintaba cinco estrellas fijas y la escala
 * no tenia donde guardarse. Una Likert de 7 puntos, que es la que se usa en
 * investigacion seria, era literalmente imposible de representar; y los anclajes
 * ("1 = Muy en desacuerdo") solo tenian sitio en el texto libre de la
 * descripcion, donde nada los lee.
 */
export const DEFAULT_SCALE = Object.freeze({ min: 1, max: 5, minLabel: "", maxLabel: "" });

/** Tope de pasos: por encima de esto ya no es una escala, es una lista. */
const MAX_SCALE_STEPS = 10;
const MIN_SCALE_STEPS = 2;

const asText = (v) =>
  typeof v === "string" ? v.trim() : v === undefined || v === null ? "" : String(v);

function clampStep(n, fallback) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(1, Math.min(MAX_SCALE_STEPS + 1, Math.round(v)));
}

/**
 * Lee los anclajes de una escala escrita en prosa:
 *
 *   "1 = Muy en desacuerdo, 5 = Muy de acuerdo"
 *   "1 = Muy en desacuerdo a 7 = Muy de acuerdo"
 *
 * El separador entre los dos extremos es lo que hay entre medias: una coma, un
 * "a", un "y" o una raya. Se aceptan todos porque cada modelo elige uno, y
 * porque el propio prompt de un usuario se escribe casi siempre como
 * "1 = X a 5 = Y".
 */
const RE_SCALE_EN_PROSA =
  /(\d+)\s*=\s*([^,;|]+?)\s*(?:,|;|\ba\b|\by\b|\bto\b|–|—|-)\s*(\d+)\s*=\s*([^,;|]+?)\s*$/i;

function scaleFromDescription(description) {
  if (typeof description !== "string") return null;
  const m = description.trim().match(RE_SCALE_EN_PROSA);
  if (!m) return null;
  const min = Number(m[1]);
  const max = Number(m[3]);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return null;
  if (max - min + 1 > MAX_SCALE_STEPS) return null;
  return { min, max, minLabel: m[2].trim(), maxLabel: m[4].trim() };
}

/**
 * Normaliza la escala venga como venga: un objeto `scale`, claves planas
 * (`scaleMin`/`scaleMax`...), o nada en absoluto. Lo que no cuadra cae al valor
 * por defecto en vez de dejar la escala rota.
 */
export function normalizeScale(raw, description = "") {
  const src = raw && typeof raw === "object" ? raw : {};

  let min = src.min ?? src.start ?? src.from ?? src.low ?? src.scaleMin;
  let max = src.max ?? src.end ?? src.to ?? src.high ?? src.scaleMax;
  let minLabel = src.minLabel ?? src.lowLabel ?? src.startLabel ?? src.fromLabel ?? src.leftLabel;
  let maxLabel = src.maxLabel ?? src.highLabel ?? src.endLabel ?? src.toLabel ?? src.rightLabel;

  /* Sin escala explicita se intenta deducir de la descripcion: si el modelo
     escribio "1 = Muy en desacuerdo, 7 = Muy de acuerdo" ahi, esa informacion es
     real y no debe perderse. */
  if ((min === undefined || max === undefined) && description) {
    const deducida = scaleFromDescription(description);
    if (deducida) {
      min ??= deducida.min;
      max ??= deducida.max;
      minLabel ??= deducida.minLabel;
      maxLabel ??= deducida.maxLabel;
    }
  }

  const lo = clampStep(min, DEFAULT_SCALE.min);
  const hi = clampStep(max, DEFAULT_SCALE.max);

  /* Una escala de un solo paso, o invertida, no es una escala. */
  if (hi - lo + 1 < MIN_SCALE_STEPS) {
    return { min: DEFAULT_SCALE.min, max: DEFAULT_SCALE.max, minLabel: asText(minLabel), maxLabel: asText(maxLabel) };
  }
  return { min: lo, max: hi, minLabel: asText(minLabel), maxLabel: asText(maxLabel) };
}

/**
 * `Boolean("false")` es `true`. Si el modelo devuelve el booleano como cadena, y
 * lo devuelve en cuanto el JSON crece y la respuesta se alarga, todos los campos
 * salen obligatorios sin que nadie lo pidiera.
 */
function toBool(v) {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (["false", "no", "0", "off"].includes(s)) return false;
    if (["true", "yes", "1", "on", "si", "sí"].includes(s)) return true;
  }
  return false;
}

export function normalizeForm(data, language = "en") {
  const src = data && typeof data === "object" ? data : {};

  /* Guarda para que una forma equivocada se note en el log y no tres minutos
     después. Pasó de verdad: `assembleForm` llamó a
     `normalizeForm(rebalancearTipos(questions))` en vez de al objeto, y
     `normalizeForm` recibió un array, no vio `questions`, devolvió el formulario
     vacío y sin quejarse. Todo el pipeline se ejecutó —85 enunciados, 36
     escalas rebalanceadas— y el resultado fue un formulario con cero bloques y
     el título "Untitled form". */
  if (Array.isArray(data)) {
    console.error(
      `[formNormalize] normalizeForm recibió un array de ${data.length} en vez de un formulario; se devolverá vacío`,
    );
  }
  const questions = Array.isArray(src.questions) ? src.questions : [];

  return {
    title: typeof src.title === "string" ? src.title : "Untitled form",
    description: typeof src.description === "string" ? src.description : "",
    theme: VALID_THEMES.includes(src.theme) ? src.theme : "modern",
    questions: questions.map((q, index) => normalizeQuestion(q, index, language)),
  };
}

export function normalizeQuestion(q, index, language = "en") {
  /* El modelo alguna vez devuelve un string suelto donde iba un objeto. */
  const raw = q && typeof q === "object" ? q : {};

  const type = resolveType(raw.type, typeof raw.label === "string" ? raw.label : "");

  /* Un bloque estático —un párrafo, un encabezado, una sección, una imagen— no es
     una pregunta, así que no se le inventa etiqueta. Se le ponía "Pregunta 1" y
     "Pregunta 2" a los dos párrafos de cabecera, que es exactamente el texto que
     un lector vería si el renderer llegara a leer `label` antes que `content`.
     Ahora lo leyó `content` y no se notó, que es la parte incómoda del asunto:
     el dato bueno estaba en el sitio correcto y el malo, en el de al lado, a la
     espera de que alguien cambiara el orden de lectura. */
  const esEstatico = STATIC_FIELD_TYPES.includes(type);
  const label = esEstatico
    ? typeof raw.label === "string"
      ? raw.label
      : ""
    : typeof raw.label === "string" && raw.label.trim()
      ? raw.label
      : language === "es"
        ? `Pregunta ${index + 1}`
        : `Question ${index + 1}`;
  const description = typeof raw.description === "string" ? raw.description : "";

  /* Una escala de Likert que el modelo escribió como un campo de opción única
     con la escala explicada en la descripción ("1 = Muy en desacuerdo, 5 = Muy
     de acuerdo") se convierte en un `score_rating` de verdad, con los anclajes
     como etiquetas de los extremos.
      Sin esto, esas preguntas se guardaban como `radio` con cinco opciones
      genéricas y los anclajes perdidos en un texto que nadie ve: exactamente el
      fallo de "las escalas Likert no estan definidas". El `rating` neutro de
      antes ya no se ofrece en el constructor (era la estrella duplicada), así
      que la Likert cae en el número, que es su dibujo actual.
      Si el modelo ya pidió estrellas o puntaje, se respeta, porque ahí el
      color con juicio de valor es lo pedido. */
  const likertEnProsa =
    !RATING_TYPES.includes(type) && /^\s*\d+\s*=/.test(description) ? scaleFromDescription(description) : null;
  const tipoFinal = likertEnProsa ? "score_rating" : type;

  /* Las opciones solo se piden a los tipos que las muestran. El resto las lleva
     vacias para no ocupar el jsonb con datos que nadie lee. */
  const labels =
    RATING_TYPES.includes(tipoFinal)
      ? []
      : OPTION_FIELD_TYPES.includes(tipoFinal)
        ? coerceOptionLabels(raw.options)
        : [];

  return {
    id: nanoid(10),
    type: tipoFinal,
    label,
    placeholder: typeof raw.placeholder === "string" ? raw.placeholder : "",
    description,
    helpText: typeof raw.helpText === "string" ? raw.helpText : "",
    required: toBool(raw.required),
    defaultValue: "",
    /* value: "" a proposito: es lo que genera el builder al crear una opcion a
       mano (lib/fieldTypes.js) y lo que espera el renderer, que guarda la
       etiqueta como respuesta. */
    options: labels.map((label) => ({ id: nanoid(8), label, value: "" })),
    content: typeof raw.content === "string" ? raw.content : "",
    /* Solo tienen sentido en una escala; en el resto viajan como null para no
       ensuciar el jsonb de cada campo del formulario. */
    scale: RATING_TYPES.includes(tipoFinal) ? normalizeScale(raw.scale, description) : null,
    dependsOn: tipoFinal === "municipality" ? "province" : undefined,
    /* Lógica condicional: se sanea al guardar para que una condición rota no
       esconda la pregunta para siempre. La IA no la emite (la deduce
       `aplicarLogicaCondicional` después), el constructor sí. */
    visibleIf: sanitizeVisibleIf(raw.visibleIf),
    isConsentGate: raw.isConsentGate === true && tipoFinal === "yes_no",
    validation: {},
    order: index,
  };
}

/**
 * Condición de visibilidad tal como la guarda el constructor
 * (`{ questionId, operator, value }`). Se sanea en vez de copiarse a ciegas:
 * una condición que apunta a nadie o con operador inventado se descarta, para
 * que un jsonb a mano no esconda preguntas sin remedio.
 */
export function sanitizeVisibleIf(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const questionId = typeof raw.questionId === "string" ? raw.questionId.trim() : "";
  if (!questionId) return null;
  return {
    questionId,
    operator: CONDITIONAL_OPERATORS.includes(raw.operator) ? raw.operator : "equals",
    value: typeof raw.value === "string" ? raw.value : String(raw.value ?? ""),
  };
}

/**
 * Mínimo de opciones para que una pregunta de elección signifique algo. Con una
 * sola no hay nada que elegir; con cero no se puede ni abrir el desplegable.
 *
 * No es un capricho: contra el proveedor real, con las reglas ya escritas en el
 * prompt, la respuesta fue `"options": "Muy Bueno"` — un único string con un
 * único valor, no la lista de 3 a 8 que se le pedía.
 */
export const MIN_CHOICE_OPTIONS = 2;

/**
 * Campos de elección que no se pueden responder tal como han llegado: menos de
 * MIN_CHOICE_OPTIONS opciones. Es lo que dispara la segunda pasada de
 * generateForm.
 */
export function choiceFieldsNeedingOptions(questions) {
  if (!Array.isArray(questions)) return [];
  return questions.filter(
    (q) =>
      q &&
      OPTION_FIELD_TYPES.includes(q.type) &&
      (!Array.isArray(q.options) || q.options.length < MIN_CHOICE_OPTIONS),
  );
}