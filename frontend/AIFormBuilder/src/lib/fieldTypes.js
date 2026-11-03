import {
  Type,
  AlignLeft,
  Mail,
  Phone,
  Hash,
  ChevronDownSquare,
  CircleDot,
  CheckSquare,
  Calendar,
  Clock,
  Star,
  Gauge,
  SlidersHorizontal,
  Upload,
  ToggleLeft,
  MapPin,
  MapPinned,
  UserRound,
  GraduationCap,
  Link as LinkIcon,
  Lock,
  Minus,
  Heading,
  Pilcrow,
  MessageSquareText,
  Image,
  ListOrdered,
} from "lucide-react";

/**
 * Single source of truth for every supported field type.
 * Drives the palette, the builder, validation, and the public renderer.
 */
export const FIELD_DEFS = {
  short_text: { label: "Texto corto", icon: Type, group: "input", hasOptions: false, placeholder: "Escribe tu respuesta" },
  long_text: { label: "Texto largo", icon: AlignLeft, group: "input", hasOptions: false, placeholder: "Escribe tu respuesta" },
  email: { label: "Email", icon: Mail, group: "input", hasOptions: false, placeholder: "name@example.com" },
  phone: { label: "Phone", icon: Phone, group: "input", hasOptions: false, placeholder: "+1 (555) 000-0000" },
  number: { label: "Number", icon: Hash, group: "input", hasOptions: false, placeholder: "0" },
  url: { label: "URL", icon: LinkIcon, group: "input", hasOptions: false, placeholder: "https://" },
  password: { label: "Password", icon: Lock, group: "input", hasOptions: false, placeholder: "••••••••" },
  address: { label: "Dirección", icon: MapPin, group: "input", hasOptions: false, placeholder: "Dirección completa" },
  province: { label: "Province", icon: MapPinned, group: "choice", hasOptions: false, placeholder: "Seleccionar…" },
  municipality: { label: "Municipality", icon: MapPinned, group: "choice", hasOptions: false, dependsOn: "province", placeholder: "Seleccionar…" },
  gender: { label: "Gender", icon: UserRound, group: "choice", hasOptions: false, placeholder: "Seleccionar…" },
  education_level: { label: "Education level", icon: GraduationCap, group: "choice", hasOptions: false, placeholder: "Seleccionar…" },
  dropdown: { label: "Dropdown", icon: ChevronDownSquare, group: "choice", hasOptions: true },
  radio: { label: "Multiple Choice", icon: CircleDot, group: "choice", hasOptions: true },
  checkbox: { label: "Checkboxes", icon: CheckSquare, group: "choice", hasOptions: true },
  yes_no: { label: "Yes / No", icon: ToggleLeft, group: "choice", hasOptions: false },
  date: { label: "Date Picker", icon: Calendar, group: "advanced", hasOptions: false },
  time: { label: "Time Picker", icon: Clock, group: "advanced", hasOptions: false },
  /* `rating` es legado: los formularios que ya lo usan lo siguen pintando igual
     (Likert neutra con el acento de marca), pero en la paleta no se ofrece para
     no duplicar las estrellas. Lo nuevo es `quality_rating` (calidad) y
     `score_rating` (número). */
  rating: { label: "Rating", icon: SlidersHorizontal, group: "advanced", hasOptions: false, hasScale: true, hidden: true },
  quality_rating: { label: "Quality Rating", icon: Star, group: "advanced", hasOptions: false, hasScale: true },
  score_rating: { label: "Number Rating", icon: Gauge, group: "advanced", hasOptions: false, hasScale: true },
  rank: { label: "Ranking", icon: ListOrdered, group: "choice", hasOptions: true },
  file: { label: "File Upload", icon: Upload, group: "advanced", hasOptions: false },
  section: { label: "Section Divider", icon: Minus, group: "layout", hasOptions: false, static: true },
  heading: { label: "Heading", icon: Heading, group: "layout", hasOptions: false, static: true },
  paragraph: { label: "Paragraph", icon: Pilcrow, group: "layout", hasOptions: false, static: true },
  /* Mensaje de apertura o cierre (bienvenida, agradecimiento, enlace a visitar):
     gemelo del párrafo en cómo se pinta, pero con tipo propio para que la IA lo
     use cuando el prompt pide mostrar un mensaje al principio o al final, en vez
     de inventar una pregunta `url` que pediría escribir una dirección. */
  message: { label: "mensaje", icon: MessageSquareText, group: "layout", hasOptions: false, static: true },
  /* Bloque de imagen premium: permite arrastrar y soltar o hacer clic para subir
     una imagen desde el computador. El contenido se muestra como vista previa
     en el formulario publicado. El nombre de archivo real se guarda como `content`
     y se sirve desde el backend con vista previa optimizada. */
  image: { label: "Bloque de imagen", icon: Image, group: "layout", hasOptions: false, static: true, upload: true },
};

export const FIELD_GROUPS = [
  { id: "input", label: "Inputs" },
  { id: "choice", label: "Choices" },
  { id: "advanced", label: "Advanced" },
  { id: "layout", label: "Layout" },
];

export const STATIC_TYPES = Object.keys(FIELD_DEFS).filter((t) => FIELD_DEFS[t].static);
export const OPTION_TYPES = Object.keys(FIELD_DEFS).filter((t) => FIELD_DEFS[t].hasOptions);

/* Los tres tipos de escala, para que la analítica y los gráficos los traten
   igual que el backend: se promedian y se dibujan como distribución. */
export const RATING_TYPES = ["rating", "quality_rating", "score_rating"];

/* Operadores de la condición `visibleIf` de una pregunta:
   { questionId, operator, value }. Viven aquí para que el constructor, el
   formulario publicado y el backend usen exactamente la misma semántica
   (el backend tiene su copia en utils/visibility.js, porque el navegador
   no puede importar de allí). */
export const CONDITIONAL_OPERATORS = ["equals", "not_equals", "includes", "not_includes"];

/** Texto normalizado para comparar respuestas ("Sí" === "si" === "SI"). */
export function normAnswerText(v) {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/* Dice si una pregunta se muestra con las respuestas dadas.
   Sin condición, siempre visible. Sin respuesta en la pregunta de la que
   depende, oculta: no se puede evaluar y lo seguro es no pedir el dato. */
export function isQuestionVisible(question, answers) {
  const cond = question?.visibleIf;
  if (!cond?.questionId) return true;
  const raw = answers?.[cond.questionId];
  const vals = Array.isArray(raw) ? raw : [raw];
  const filled = vals.filter((v) => v !== undefined && v !== null && v !== "");
  if (!filled.length) return false;
  const want = normAnswerText(cond.value);
  if (cond.operator === "includes") return filled.some((v) => normAnswerText(v) === want);
  if (cond.operator === "not_includes") return !filled.some((v) => normAnswerText(v) === want);
  if (cond.operator === "not_equals") return normAnswerText(filled[0]) !== want;
  return normAnswerText(filled[0]) === want;
}

/* Puerta de consentimiento: un "No" (o "No, gracias") en una pregunta marcada
   como `isConsentGate` cierra la encuesta con agradecimiento. */
export function isConsentDeclined(question, value) {
  if (!question?.isConsentGate) return false;
  const v = normAnswerText(value);
  return v === "no" || v.startsWith("no ") || v.startsWith("no,") || v.startsWith("no;") || ["n", "false", "0", "nope"].includes(v);
}

/* Lista de lo que se pinta: las estáticas siempre, las secciones solo si les
   queda contenido visible debajo (una cabecera huérfana confunde más que
   ordena), y las preguntas según su condición. */
export function visibleRenderList(questions, answers) {
  const out = [];
  let pendingSection = null;
  const flushSection = () => {
    if (pendingSection) out.push(pendingSection);
    pendingSection = null;
  };
  for (const q of questions || []) {
    if (q?.type === "section") {
      pendingSection = q;
      continue;
    }
    if (isStatic(q?.type)) {
      flushSection();
      out.push(q);
      continue;
    }
    if (!isQuestionVisible(q, answers)) continue;
    flushSection();
    out.push(q);
  }
  return out;
}

/**
 * Campos de elección que no se pueden responder tal como están: sin opciones, o
 * con una sola. Se dibujan como una lista desplegable que se abre vacía o con un
 * único elemento, y eso no se ve como error hasta que alguien lo abre, así que
 * hay que poder señalarlo.
 *
 * El mínimo de 2 no es arbitrario: el proveedor de IA devolvió una vez
 * `"options": "Muy Bueno"` para una pregunta de valoración, que llega bien
 * parseada y es igual de inútil que no tener nada.
 */
export const MIN_CHOICE_OPTIONS = 2;

/**
 * Escala por defecto de un `rating`: cinco puntos sin anclas.
 *
 * Antes el rating eran cinco estrellas fijas y no había dónde guardar una
 * escala de 7 puntos ni sus extremos ("1 = Muy en desacuerdo"). Ahora la escala
 * son datos del campo, y 1 a 5 sin rótulo es exactamente lo que se veía antes —
 * así que los formularios que ya existen no cambian de aspecto.
 *
 * Los anclajes de los extremos van aquí porque son el motivo de tener escala:
 * sin ellos, un 1 y un 5 no significan nada para quien responde.
 */
export const DEFAULT_SCALE = Object.freeze({ min: 1, max: 5, minLabel: "", maxLabel: "" });

/** Tope de pasos: por encima de esto ya no es una escala, es una lista. */
export const MAX_SCALE_STEPS = 10;
export const MIN_SCALE_STEPS = 2;

/** Escala que se va a pintar, tolerando campos viejos sin `scale` o con basura. */
export function scaleOf(field) {
  const s = field?.scale;
  if (!s || typeof s !== "object") return DEFAULT_SCALE;
  const min = Number(s.min);
  const max = Number(s.max);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return DEFAULT_SCALE;
  if (max - min + 1 < MIN_SCALE_STEPS) return DEFAULT_SCALE;
  return { min, max, minLabel: String(s.minLabel ?? ""), maxLabel: String(s.maxLabel ?? "") };
}

export function choiceFieldsNeedingOptions(questions = []) {
  if (!Array.isArray(questions)) return [];
  return questions.filter(
    (q) => q && OPTION_TYPES.includes(q.type) && (q.options?.length ?? 0) < MIN_CHOICE_OPTIONS,
  );
}

export function isStatic(type) {
  return STATIC_TYPES.includes(type);
}

export function getSpecialFieldType(field) {
  if (["province", "municipality", "gender", "education_level"].includes(field.type)) return field.type;
  if (!["dropdown", "radio"].includes(field.type)) return field.type;

  const label = String(field.label || "").toLowerCase();
  if (label.includes("provincia") || label.includes("province")) return "province";
  if (label.includes("municipio") || label.includes("municipality")) return "municipality";
  if (label.includes("género") || label.includes("genero") || label.includes("gender")) return "gender";
  if (label.includes("escolaridad") || label.includes("educación") || label.includes("educacion") || label.includes("educativo") || label.includes("educativa") || label.includes("education")) return "education_level";
  return field.type;
}

let counter = 0;
function uid(prefix = "q") {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter}`;
}

/** Build a fresh question object with sensible defaults for its type. */
export function createField(type) {
  const def = FIELD_DEFS[type];
  const base = {
    id: uid(),
    type,
    label: def.label,
    placeholder: def.placeholder || "",
    description: "",
    helpText: "",
    required: false,
    defaultValue: "",
    options: [],
    content: "",
    validation: { minLength: null, maxLength: null, min: null, max: null, pattern: "", message: "" },
  };

  if (def.hasOptions) {
    base.options = [
      { id: uid("opt"), label: "Option 1", value: "" },
      { id: uid("opt"), label: "Option 2", value: "" },
      { id: uid("opt"), label: "Option 3", value: "" },
    ];
  }
  /* Las tres escalas llevan `scale`, y solo ellas: meterla en el resto de
     campos sería ruido que ni se lee ni se guarda. */
  if (def.hasScale) base.scale = { ...DEFAULT_SCALE };
  /* Lógica condicional: sin condición la pregunta siempre se ve; la puerta de
     consentimiento solo tiene sentido en un sí/no y se activa en el panel. */
  base.visibleIf = null;
  base.isConsentGate = false;
  if (type === "heading") base.content = "Section heading";
  if (type === "paragraph") base.content = "Add a short description to guide your respondents.";
  if (type === "image") base.content = "";

  return base;
}

export { uid };
