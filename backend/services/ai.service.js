import { generateJson, generateText } from "./remote.service.js";
import { ApiError } from "../utils/ApiError.js";
import { nanoid } from "../utils/nanoid.js";
import { FIELD_TYPES, STATIC_FIELD_TYPES, RATING_TYPES } from "../utils/constants.js";
import { normalizeForm, normalizeScale } from "../utils/formNormalize.js";

import { auditarFormulario } from "../utils/formAudit.js";
import { obtenerDeCache, guardarEnCache, obtenerEstadisticasCache } from "../utils/aiCacheOptimized.js";

/* Distribución fija exigida por el formulario de 15 preguntas.
   3 radio + 4 checkbox + 5 score_rating(1-5) + 1 score_rating(0-10 NPS) + 2 long_text = 15 */
const DISTRIBUCION_OBJETIVO = {
  radio: 3,
  checkbox: 4,
  scoreRating1to5: 5,
  scoreRating0to10: 1,
  longText: 2,
  total: 15,
};

export async function generateForm(prompt, language = "en") {
  if (!prompt?.trim())
    throw ApiError.badRequest("Describe the form you want to create");

  const t0 = Date.now();

  /* Caché: mismo prompt, misma respuesta. Sin tocar el modelo, instantáneo. */
  const desdeCache = obtenerDeCache(prompt);
  if (desdeCache) {
    console.warn(
      `[ai.service][tiempo] generateForm CACHE HIT: ${Date.now() - t0} ms, ${desdeCache.questions.length} preguntas`,
    );
    desdeCache.aiNotes = auditarFormulario(desdeCache, prompt);
    return desdeCache;
  }

  const etapa = (nombre) => {
    const ahora = Date.now();
    console.warn(`[ai.service][tiempo] ${nombre}: ${ahora - t0} ms (total)`);
  };

  /* --- Fast-path: peticiones cortas/explícitas (sin LLM) --- */
  if (esPeticionCorta(prompt)) {
    const pegado = parsearFormularioPegado(prompt);
    if (pegado) {
      console.warn(`[ai.service] formulario pegado en el prompt: ${pegado.questions.length} bloque(s), sin llamar al modelo`);
      pegado.aiNotes = auditarFormulario(pegado, prompt);
      return guardarEnCache(prompt, pegado);
    }

    const especificada = parsearEspecificacion(prompt, language);
    if (especificada) {
      etapa("atajo: especificacion parseada (sin modelo)");
      especificada.aiNotes = auditarFormulario(especificada, prompt);
      return guardarEnCache(prompt, especificada);
    }

    const lista = parsearListaDeCampos(prompt, language);
    if (lista) {
      console.warn(
        `[ai.service] lista de campos leida del prompt: ${lista.questions.length} bloque(s), sin llamar al modelo`,
      );
      lista.aiNotes = auditarFormulario(lista, prompt);
      return guardarEnCache(prompt, lista);
    }
  }

  /* --- Single-shot generation: ONE call to generateJson, max 2 tries --- */
  /* Extrae el tema del prompt para incluirlo en la instrucción. */
  const topico = extraerTopico(prompt) || "(el tema principal del prompt)";

  let mejorEsfuerzo = null;
  let intento = 0;
  const MAX_INTENTOS = 2; /* 1° intento + 1 reintento ultra-estricto */

  while (intento < MAX_INTENTOS) {
    intento++;
    const esRetry = intento === 2;

    const systemPrompt = esRetry
      ? `Eres un generador de formularios en JSON extremadamente estricto. Debes seguir ESTRICTAMENTE las reglas. Si fallas, el usuario verá un formulario incompleto. Responde SOLO con JSON válido, sin markdown, sin explicaciones, sin texto adicional.`
      : `Eres un generador de formularios de encuesta en JSON. Responde SOLO con JSON válido, sin markdown, sin explicaciones.`;

    const promptBase = esRetry
      ? `${prompt}

REGLAS ULTRA-ESTRICTAS - CUMPLE EXACTAMENTE:
- EXACTAMENTE 15 preguntas respondibles (excluye section, heading, paragraph, message, image)
- Distribución OBLIGATORIA y exacta:
  3 preguntas de tipo "radio" (opción única, DEBE tener options de 3-6 items)
  4 preguntas de tipo "checkbox" (selección múltiple, DEBE tener options de 3-6 items)
  5 preguntas de tipo "score_rating" con scale {min:1, max:5, minLabel:"Muy en desacuerdo", maxLabel:"Muy de acuerdo"}
  1 pregunta de tipo "score_rating" con scale {min:0, max:10, minLabel:"Nada probable", maxLabel:"Muy probable"}
  2 preguntas de tipo "long_text"
- CADA pregunta debe ser sobre: ${topico}
- NO inventes secciones, headings, paragraphs, messages, ni preguntas extra
- NO uses tipos: dropdown, yes_no, short_text, quality_rating, rank, number, email, date
- radio y checkbox DEBEN tener options[] con 3-6 strings cada uno
- score_rating NO necesita options, pero SI necesita scale {min, max, minLabel, maxLabel}
- required: true solo para las 3-5 primeras preguntas, false para el resto
- title: string breve (4-10 palabras sobre ${topico})
- description: string de introducción (2-4 frases sobre ${topico}, incluye que es anónima y voluntaria)
- theme: "minimal"
- questions: array de exactamente 15 objetos en el orden exacto listado arriba`
      : `${prompt}

Genera EXACTAMENTE 15 preguntas sobre "${topico}" con esta distribución obligatoria:
- 3 radio (opción única, con options de 3-6 items)
- 4 checkbox (selección múltiple, con options de 3-6 items)
- 5 score_rating con scale {min:1, max:5, minLabel:"Muy en desacuerdo", maxLabel:"Muy de acuerdo"}
- 1 score_rating con scale {min:0, max:10, minLabel:"Nada probable", maxLabel:"Muy probable"}
- 2 long_text (abiertas)

Cada pregunta debe mencionar "${topico}". Usa el tipo exacto requerido, no inventes otros.`;

    const schemaHint = `{
  "title": string,
  "description": string,
  "theme": "minimal",
  "questions": [
    {
      "type": "radio" | "checkbox" | "score_rating" | "long_text",
      "label": string,
      "required": boolean,
      "options": string[],
      "scale": { "min": number, "max": number, "minLabel": string, "maxLabel": string },
      "description": string
    }
  ]
}`;

    try {
      const data = await generateJson(
        promptBase,
        { systemPrompt, schemaHint },
      );

      const raiz = data?.form && typeof data.form === "object" ? data.form : data;
      const preguntasCrudas = extraerLista(raiz);

      if (!preguntasCrudas.length) {
        throw new Error("AI returned no questions");
      }

      /* Normaliza cada pregunta al formato interno */
      const bloques = preguntasCrudas.map((q) => {
        const tipo = tipoDesdeTexto(q?.type);
        const escala = normalizeScale(q?.scale, q?.label);
        return {
          id: nanoid(10),
          type: tipo,
          label: String(q?.label || "").trim(),
          placeholder: "",
          description: String(q?.description || "").trim(),
          helpText: "",
          required: Boolean(q?.required),
          defaultValue: "",
          options: Array.isArray(q?.options)
            ? q.options
                .filter((o) => typeof o === "string" && o.trim())
                .map((o) => ({ id: nanoid(8), label: o.trim(), value: "" }))
            : [],
          content: "",
          scale: RATING_TYPES.includes(tipo) ? escala : null,
          validation: {},
          visibleIf: null,
          isConsentGate: false,
        };
      });

      const formTemp = normalizeForm(
        {
          title: String(raiz?.title || "").trim(),
          description: String(raiz?.description || "").trim(),
          theme: "minimal",
          questions: bloques,
        },
        language,
      );

      /* Aplicar post-procesos deterministas (sin llamadas al modelo) */
      aplicarLogicaCondicional(formTemp);
      convertirEnlacesInformativos(formTemp);
      asegurarConsentimiento(formTemp, prompt, language);
      asegurarCierre(formTemp, prompt, language);

      /* Validar distribución */
      const validacion = validarFormulario(formTemp, prompt);
      if (validacion.valid) {
        etapa(`generación single-shot OK (${intento === 1 ? "1er intento" : "reintento"})`);
        formTemp.aiNotes = auditarFormulario(formTemp, prompt);
        return guardarEnCache(prompt, formTemp);
      }

      console.warn(`[ai.service] Validación fallida (intento ${intento}): ${validacion.errors.join('; ')}`);

      /* Guardar el mejor esfuerzo por si el reintento también falla */
      if (!mejorEsfuerzo || validacion.errors.length < (validarFormulario(mejorEsfuerzo, prompt).errors.length || Infinity)) {
        mejorEsfuerzo = formTemp;
      }

      if (intento >= MAX_INTENTOS) {
        console.warn(`[ai.service] Máximo de reintentos alcanzado. Devolviendo mejor esfuerzo.`);
        mejorEsfuerzo.aiNotes = auditarFormulario(mejorEsfuerzo, prompt);
        return guardarEnCache(prompt, mejorEsfuerzo);
      }
    } catch (err) {
      console.error(`[ai.service] Error en generación (intento ${intento}): ${err.message}`);

      if (intento >= MAX_INTENTOS) {
        if (mejorEsfuerzo) {
          console.warn(`[ai.service] Devolviendo mejor esfuerzo del intento anterior.`);
          mejorEsfuerzo.aiNotes = auditarFormulario(mejorEsfuerzo, prompt);
          return guardarEnCache(prompt, mejorEsfuerzo);
        }
        throw ApiError.internal(
          "The AI provider returned no questions. Try again in a moment or check the provider quota.",
          {
            diagnostic: {
              error: err.message,
              intentos: intento,
            },
          },
        );
      }
    }
  }

  /* No debería llegar aquí, pero por seguridad devolvemos el mejor esfuerzo */
  if (mejorEsfuerzo) {
    mejorEsfuerzo.aiNotes = auditarFormulario(mejorEsfuerzo, prompt);
    return guardarEnCache(prompt, mejorEsfuerzo);
  }

  throw ApiError.internal(
    "The AI provider returned no questions. Try again in a moment or check the provider quota.",
    {
      diagnostic: {
        intentos: MAX_INTENTOS,
        pipelineSteps: "single-shot generateJson (2 intentos)",
      },
    },
  );
}

/* === Helper functions (preserved from original) === */

/** El numero de campos que pide el autor, o 0 si no lo dice de forma explicita. */
function numeroPedido(prompt) {
  const texto = String(prompt || "");
  const digito = texto.match(/\b([1-9]\d?)\s+(?:campo|pregunta|apartado)/i);
  if (digito) return Number(digito[1]);
  const palabra = texto.match(
    /\b(?:un|una|dos|tres|cuatro|cinco|seis)\s+(?:campos|preguntas|apartados)\b/i,
  );
  if (!palabra) return 0;
  const n = { un: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6 };
  return n[palabra[0].toLowerCase()] || 0;
}

/* Si el autor pega el formulario ya montado en json. Vale tanto si viene en un
   bloque cercado como suelto. */
const TRAE_JSON_DE_FORMULARIO = /\{[\s\S]*?"(?:fields|questions)"\s*:\s*\[/i;

/* La misma especificacion escrita en markdown */
const TRAE_ESPECIFICACION_MD = /^\s*#{1,6}\s*preguntas?\s*(?:\d+)?\s*:?\s*$/im;

/* Una linea de la lista numerada de campos */
const LINEA_DE_CAMPO =
  /^[ \t]*(?:[-*+]\s*)?campo\s*\d+\s*:\s*`?[A-Za-z_]+`?\s*\([^)\n]+\)/gmi;

/** Los tipos que se piden en prosa, en español y en inglés, al catálogo interno. */
const TIPOS_EN_PROSA = [
  [/escala\s+lineal|num[eé]rica|linear\s+scale|numeric\s+scale|\bpuntua\w*\b/i, "score_rating"],
  [/selecci[oó]n\s+m[uú]ltiple|multiple\s+choice|checkbox|opciones\s+m[uú]ltiple/i, "checkbox"],
  [/opci[oó]n\s+[uú]nica|single\s+choice|radio/i, "radio"],
  [/lista\s+desplegable|desplegable|dropdown|select\b/i, "dropdown"],
  [/escala\s+de\s+estrellas|estrellas|stars?\s+rating/i, "quality_rating"],
  [/s[íi]\s*\/\s*no|(?:^|\W)si\/no|boolean|yes\s*\/?\s*no/i, "yes_no"],
  [/text[oa]\s+larg|larg[oa]\s+text|textarea|paragraph/i, "long_text"],
  [/correo|e-?mail/i, "email"],
  [/tel[eé]fono|phone/i, "phone"],
  [/fecha|date\b/i, "date"],
  [/hora|clock|time\s+picker/i, "time"],
  [/n[uú]mero|number\b/i, "number"],
  [/direcci[oó]n|address/i, "address"],
  [/archivo|adjuntar|upload|file\b/i, "file"],
  [/orden|rank/i, "rank"],
  [/text[oa]\s+cort|short\s+text|linea\s+[uú]nica|single\s+line/i, "short_text"],
];

/** De "text" a "short_text": los nombres que usa la gente, no los del catalogo. */
const TIPOS_EXTERNOS = {
  text: "short_text",
  short_text: "short_text",
  textarea: "long_text",
  long_text: "long_text",
  email: "email",
  phone: "phone",
  number: "number",
  dropdown: "dropdown",
  select: "dropdown",
  radio: "radio",
  single_choice: "radio",
  checkbox: "checkbox",
  multiple_choice: "checkbox",
  multi_select: "checkbox",
  date: "date",
  time: "time",
  file: "file",
  address: "address",
  rank: "rank",
  linear_scale: "score_rating",
  scale: "score_rating",
  rating: "quality_rating",
  stars: "quality_rating",
  yes_no: "yes_no",
  boolean: "yes_no",
};

/** Traduce una descripción de tipo en prosa al catálogo interno. */
function tipoDesdeTexto(bruto) {
  const texto = String(bruto || "").toLowerCase();
  if (!texto.trim()) return "short_text";
  if (FIELD_TYPES.includes(texto)) return texto;
  if (TIPOS_EXTERNOS[texto]) return TIPOS_EXTERNOS[texto];
  for (const [patron, tipo] of TIPOS_EN_PROSA) if (patron.test(texto)) return tipo;
  return "short_text";
}

/**
 * ¿El autor esta pidiendo un formulario de un puñado de campos?
 *
 * El criterio es doble y ambos tienen que cumplirse:
 *  - La peticion nombra un numero BAJO (1 a 6) de forma explicita.
 *  - El texto es corto. Una encuesta real se describe en un parrafo largo.
 */
export function esPeticionCorta(prompt) {
  const texto = String(prompt || "");
  if (!texto.trim()) return false;

  if (TRAE_JSON_DE_FORMULARIO.test(texto)) return true;
  if (TRAE_ESPECIFICACION_MD.test(texto)) return true;
  if ((texto.match(LINEA_DE_CAMPO) || []).length >= 2) return true;
  if (numeroPedido(texto) > 0) return true;

  if (texto.length > 400) return false;

  const bajito = /\b(?:un[ao]?\s+sol[oa]|s[oó]l[oa]\s+un[ao]?|[uú]n?ic[ao]|1|2|3|4|5|6)\s+(?:campo|pregunta|apartado|opci[oó]n)/i;
  const porPalabra = /\b(?:un|una|dos|tres|cuatro|cinco|seis)\s+(?:campos|preguntas|apartados)/i;
  if (!bajito.test(texto) && !porPalabra.test(texto)) return false;

  if (/\b\d{2,}\s*(?:preguntas|campos|apartados|medidas|ítems|items|ejes)\b/i.test(texto)) return false;
  return true;
}

/**
 * Lee el formulario que el autor ya trae escrito en el prompt (JSON pegado).
 * Se parsea en codigo sin llamadas al modelo.
 */
export function parsearFormularioPegado(prompt, language = "en") {
  const texto = String(prompt || "");
  if (!TRAE_JSON_DE_FORMULARIO.test(texto)) return null;

  const candidatos = [];
  const cercados = texto.match(/```(?:json)?\s*([\s\S]*?)```/gi) || [];
  for (const m of cercados) candidatos.push(m);
  const clave = /"(?:fields|questions)"\s*:\s*\[/i.exec(texto);
  const desde = clave ? texto.lastIndexOf("{", clave.index) : -1;
  const recorte = desde === -1 ? null : recortarObjeto(texto, desde);
  if (recorte) candidatos.push(recorte);

  /* "Genera", "crea", "construye"…: el autor describe lo que quiere, no pega el formulario ya hecho. */
  const PIDE_GENERAR =
    /\b(?:genera|generar|generad|generaci[oó]n|crea|crear|construye|construir|elabora|elaborar|dise[ñn]a|arma|haz)\b/i;

  const ETIQUETA_DE_EJEMPLO =
    /^(?:texto|label|etiqueta)\s*(?:de\s+(?:la\s+)?)?(?:pregunta|campo|ejemplo)?\s*\d*$|^(?:pregunta|question|field|campo)\s*\d*$/i;

  function etiquetasDeEjemplo(crudas) {
    return crudas.every((q) =>
      ETIQUETA_DE_EJEMPLO.test(String(q?.label || q?.name || q?.title || "").trim()),
    );
  }

  for (const bruto of candidatos) {
    let datos;
    try {
      datos = JSON.parse(bruto.trim());
    } catch {
      continue;
    }
    if (!datos || typeof datos !== "object") continue;

    const crudas = Array.isArray(datos.fields)
      ? datos.fields
      : Array.isArray(datos.questions)
        ? datos.questions
        : null;
    if (!crudas?.length) continue;

    /* Un único ejemplo de formato dentro de una petición que además manda generar */
    if (PIDE_GENERAR.test(texto) && (crudas.length < 2 || etiquetasDeEjemplo(crudas))) continue;

    const bloques = [];
    for (const q of crudas) {
      if (!q || typeof q !== "object") continue;

      const bruto = String(q.type || "").toLowerCase();
      const tipo = FIELD_TYPES.includes(bruto) ? bruto : TIPOS_EXTERNOS[bruto] || "short_text";

      const opciones = Array.isArray(q.options)
        ? q.options
            .map((o) => (typeof o === "string" ? o : o?.label))
            .filter((o) => typeof o === "string" && o.trim())
            .map((o) => ({ id: nanoid(8), label: o.trim(), value: "" }))
        : [];

      let escala = null;
      if (RATING_TYPES.includes(tipo)) {
        const s = q.scale && typeof q.scale === "object" ? q.scale : q;
        escala = normalizeScale(
          {
            min: s.min ?? q.min,
            max: s.max ?? q.max,
            minLabel: s.minLabel ?? q.minLabel ?? "",
            maxLabel: s.maxLabel ?? q.maxLabel ?? "",
          },
          q.label,
        );
      }

      const validacion = {};
      const v = q.validation && typeof q.validation === "object" ? q.validation : {};
      if (Number.isFinite(v.minLength)) validacion.minLength = v.minLength;
      if (Number.isFinite(v.maxLength)) validacion.maxLength = v.maxLength;
      if (Number.isFinite(v.min)) validacion.min = v.min;
      if (Number.isFinite(v.max)) validacion.max = v.max;
      if (typeof v.pattern === "string" && v.pattern) validacion.pattern = v.pattern;
      if (typeof v.message === "string" && v.message) validacion.message = v.message;

      bloques.push({
        id: nanoid(10),
        type: tipo,
        label: String(q.label || q.name || q.title || "").trim(),
        placeholder: String(q.placeholder || "").trim(),
        description: String(q.helpText || q.description || q.hint || "").trim(),
        helpText: String(q.helpText || "").trim(),
        required: Boolean(q.required),
        defaultValue: "",
        options: opciones,
        content: "",
        scale: escala,
        validation: validacion,
        visibleIf: null,
        isConsentGate: false,
      });
    }

    if (!bloques.length) continue;

    const form = normalizeForm(
      { title: String(datos.title || "").trim(), description: String(datos.description || "").trim(), theme: "minimal", questions: bloques },
      language,
    );
    console.warn(
      `[ai.service] formulario leido del prompt: ${form.questions.length} bloque(s), ` +
        `${tituloOpcional(form.title)}`,
    );
    return form;
  }

  console.warn("[ai.service] el prompt traia un json de formulario, pero no se pudo leer");
  return null;
}

/* Recorta el objeto JSON que abre en `desde` contando llaves. */
function recortarObjeto(texto, desde) {
  let nivel = 0;
  let enCadena = false;
  let escape = false;
  for (let i = desde; i < texto.length; i++) {
    const c = texto[i];
    if (enCadena) {
      if (escape) escape = false;
      else if (c === "\\") escape = true;
      else if (c === '"') enCadena = false;
      continue;
    }
    if (c === '"') enCadena = true;
    else if (c === "{") nivel++;
    else if (c === "}" && --nivel === 0) return texto.slice(desde, i + 1);
  }
  return null;
}

function tituloOpcional(titulo) {
  return titulo ? `titulo "${titulo}"` : "sin titulo (se conserva el del formulario)";
}

/**
 * Lee la especificación en markdown que escribe el autor a mano.
 * Se parsea en codigo: cero llamadas al modelo.
 */
export function parsearEspecificacion(prompt, language = "en") {
  const texto = String(prompt || "");
  if (!TRAE_ESPECIFICACION_MD.test(texto)) return null;

  const lineas = texto.split(/\r?\n/);
  const cabeceras = [];
  for (const [i, l] of lineas.entries()) {
    const m = l.match(/^[ \t]*(#{1,6})[ \t]*(.+?)[ \t]*$/);
    if (m) cabeceras.push({ i, titulo: m[2] });
  }

  const cuerpoDe = (indice) => {
    const fin = cabeceras.find((c) => c.i > indice)?.i ?? lineas.length;
    return lineas.slice(indice + 1, fin);
  };

  const seccion = (patron) => {
    const c = cabeceras.find((h) => patron.test(h.titulo));
    if (!c) return "";
    return cuerpoDe(c.i)
      .filter((l) => l.trim())
      .slice(0, 3)
      .join(" ")
      .trim();
  };

  const titulo = seccion(/t[ií]tulo\s+del\s+formulario|^\s*t[ií]tulo\s*$/i);
  const descripcion = seccion(/descripci[oó]n\s+del\s+formulario|^\s*descripci[oó]n\s*$/i);

  const marcas = cabeceras.filter((h) => /^preguntas?\s*\d+/i.test(h.titulo));
  if (!marcas.length) return null;

  const RE_CLAVE =
    /^[ \t]*(?:[-*+]\s*)?\**\s*([A-Za-zÁÉÍÓÚÑáéíóúñ][A-Za-zÁÉÍÓÚÑáéíóúñ ]{1,24}?)\s*\**\s*[:：]\s*\**\s*(.*)$/i;

  const bloques = [];
  for (const [i, marca] of marcas.entries()) {
    const fin = marcas[i + 1]?.i ?? cabeceras.find((c) => c.i > marca.i)?.i ?? lineas.length;
    const cuerpo = lineas.slice(marca.i + 1, fin);

    const pares = [];
    for (const l of cuerpo) {
      const m = l.match(RE_CLAVE);
      if (m) pares.push({ clave: m[1].trim().toLowerCase(), valor: (m[2] || "").trim() });
    }
    const dato = (clave) => {
      const re = new RegExp(`^(?:${clave})$`, "i");
      return pares.find((p) => re.test(p.clave))?.valor || "";
    };

    const nombre = dato("nombre|label|etiqueta");
    if (!nombre) continue;

    const tipoTexto = dato("tipo|type");
    const tipo = tipoDesdeTexto(tipoTexto);
    const obligatoria = /^\s*(si|s[íí]|yes|true|obligatoria)/i.test(dato("obligatoria|required"));
    const orientacion = dato("orientaci[oó]n|descripci[oó]n|help|ayuda");

    let etiquetas = leerListaOpciones(dato("opciones|options"));
    if (!etiquetas.length) {
      const sueltas = cuerpo.filter((l) => /^[ \t]*(?:\d+[.)]|[-*+])\s*/.test(l));
      for (const l of sueltas) {
        if (RE_CLAVE.test(l)) continue;
        etiquetas.push(...leerListaOpciones(l.replace(/^[ \t]*(?:\d+[.)]|[-*+])\s*/, "")));
      }
      etiquetas = [...new Set(etiquetas)];
    }
    if (!etiquetas.length) etiquetas = extraerOpcionesDeFrase(orientacion);

    let escala = null;
    if (RATING_TYPES.includes(tipo)) {
      const rango = tipoTexto.match(/(\d+)\s*(?:a|al|-|y|hasta)\s*(\d+)/i);
      const { min, max } = escalaDesdeFrase(orientacion, rango);
      escala = normalizeScale({ min, max }, nombre);
    }

    bloques.push({
      id: nanoid(10),
      type: tipo,
      label: nombre,
      placeholder: dato("placeholder"),
      description: orientacion,
      helpText: orientacion,
      required: obligatoria,
      defaultValue: "",
      options: etiquetas.map((o) => ({ id: nanoid(8), label: o, value: "" })),
      content: "",
      scale: escala,
      validation: leerValidacion(dato("validaci[oó]n|validation"), tipo, orientacion),
      visibleIf: null,
      isConsentGate: false,
    });
  }

  if (!bloques.length) return null;

  const form = normalizeForm(
    { title: titulo, description: descripcion, theme: "minimal", questions: bloques },
    language,
  );
  console.warn(
    `[ai.service] especificacion leida del prompt: ${form.questions.length} bloque(s), ` +
      `${titulo ? `titulo "${titulo}"` : "sin titulo"}`,
  );
  return form;
}

/** Lee la lista numerada de campos que escribe el autor a mano. */
export function parsearListaDeCampos(prompt, language = "en") {
  const texto = String(prompt || "");
  const lineas = texto.split(/\r?\n/);

  const titulo =
    texto.match(/t[ií]tulo(?:\s+del\s+formulario)?\s*[:：]\s*["'«“]([^"'»”]+)["'»”]/i)?.[1]?.trim() || "";
  const descripcion =
    texto.match(/descripci[oó]n(?:\s+del\s+formulario)?\s*[:：]\s*["'«“]([^"'»”]+)["'»”]/i)?.[1]?.trim() || "";

  const comillasDe = (t) =>
    [...t.matchAll(/["'«“]([^"'«“»]{1,60})["'»”]/g)].map((m) => m[1].trim());

  const bloques = [];
  for (const l of lineas) {
    const m = l.match(/^\s*(?:[-*+]\s*)?campo\s*\d+\s*:\s*`?([A-Za-z_]+)`?\s*\(([^)\n]+)\)/i);
    if (!m) continue;

    const tipo = tipoDesdeTexto(m[1]);
    const resto = m[2].trim();
    const obligatoria = /\b(?:obligatori[oa]|requerid[oa]|required)\b/i.test(resto);
    const comillas = comillasDe(resto);
    const esEscala = RATING_TYPES.includes(tipo);

    let nombre = resto.split(/["'«“]/)[0];
    nombre = nombre
      .replace(/\s*[:：]\s*(?:escala|del\s+\d|rango|scale)\b[\s\S]*$/i, "")
      .replace(/[:：\-\s]+$/, "")
      .trim();

    let etiquetas = [];
    let escala = null;
    if (esEscala) {
      const rango = resto.match(/(\d+)\s*(?:a|al|-|y|hasta)\s*(\d+)/i);
      escala = normalizeScale(
        {
          min: rango ? Number(rango[1]) : undefined,
          max: rango ? Number(rango[2]) : undefined,
          minLabel: comillas[0] || "",
          maxLabel: comillas.length > 1 ? comillas[comillas.length - 1] : "",
        },
        nombre,
      );
    } else {
      etiquetas = [...new Set(comillas)];
      if (!etiquetas.length) {
        const colon = resto.indexOf(":");
        if (colon >= 0) etiquetas = leerListaOpciones(resto.slice(colon + 1));
      }
    }

    bloques.push({
      id: nanoid(10),
      type: tipo,
      label: nombre,
      placeholder: "",
      description: "",
      helpText: "",
      required: obligatoria,
      defaultValue: "",
      options: etiquetas.map((o) => ({ id: nanoid(8), label: o, value: "" })),
      content: "",
      scale: escala,
      validation: {},
      visibleIf: null,
      isConsentGate: false,
    });
  }

  if (bloques.length < 2) return null;

  const form = normalizeForm(
    { title: titulo, description: descripcion, theme: "minimal", questions: bloques },
    language,
  );
  console.warn(
    `[ai.service] lista de campos leida del prompt: ${form.questions.length} bloque(s), ` +
      `${titulo ? `titulo "${titulo}"` : "sin titulo"}`,
  );
  return form;
}

function leerListaOpciones(texto) {
  const salida = [];
  for (const trozo of String(texto || "").split(/\s*(?:,|;|\|\/|\bo\b|\by\b)\s*/i)) {
    const t = trozo
      .replace(/^[\s\-*+]+/, "")
      .replace(/^\d+[.)]\s*/, "")
      .replace(/^["'«“]|[»”]$/g, "")
      .trim();
    if (t) salida.push(t);
  }
  return [...new Set(salida)].slice(0, 30);
}

function extraerOpcionesDeFrase(frase) {
  const texto = String(frase || "");
  if (!/\bentre\b|\bopciones?\b|\boptions?\b/i.test(texto)) return [];
  const m = texto.match(/\bentre\b\s*[:：]?\s*([\s\S]+)$/i) || texto.match(/\bopciones?\b\s*[:：]?\s*([\s\S]+)$/i);
  const cola = m?.[1];
  if (!cola) return [];
  const limpio = cola
    .replace(/\bselecciona\w*\b[\s\S]*$/i, "")
    .replace(/\.\s*$/, "")
    .trim();
  const salida = [];
  for (const trozo of limpio.split(/\s*(?:,|;|\bo\b|\|\/|\by\b)\s*/i)) {
    const t = trozo
      .replace(/^["'«“]|[»”]$/g, "")
      .replace(/^\s*y\s*/i, "")
      .trim();
    if (t && t.split(/\s+/).length <= 8) salida.push(t);
  }
  return [...new Set(salida)].slice(0, 30);
}

function escalaDesdeFrase(frase, rango) {
  const texto = String(frase || "");
  const comillas = [...texto.matchAll(/["'«“]([^"'«“»]{2,40})["'»”]/g)].map((m) => m[1].trim());
  let min = rango?.[1] ? Number(rango[1]) : 1;
  let max = rango?.[2] ? Number(rango[2]) : 5;
  const explicit = texto.match(/(\d+)\s*(?:=|es|significa)\s*["'«“]([^"'«“»]{2,40})["'»”]/i);
  if (explicit) {
    const n = Number(explicit[1]);
    const etiqueta = explicit[2].trim();
    if (n === min) return { min, max, minLabel: etiqueta, maxLabel: "" };
    if (n === max) return { min, max, minLabel: "", maxLabel: etiqueta };
  }
  return { min, max, minLabel: "", maxLabel: "" };
}

function leerValidacion(vineta, tipo, orientacion) {
  const texto = `${vineta} ${orientacion || ""}`;
  if (!texto.trim()) return {};
  const salida = {};
  const rango = texto.match(/m[ií]n(?:imo)?\s*:?\s*(\d+)[^\d]{0,20}m[aá]x(?:imo)?\s*:?\s*(\d+)/i);
  if (rango) {
    salida.minLength = Number(rango[1]);
    salida.maxLength = Number(rango[2]);
  }
  const soloMax = texto.match(/m[aá]x(?:imo)?\s*:?\s*(\d+)/i);
  if (soloMax && !salida.maxLength) salida.maxLength = Number(soloMax[1]);
  const soloMin = texto.match(/m[ií]n(?:imo)?\s*:?\s*(\d+)/i);
  if (soloMin && !salida.minLength) salida.minLength = Number(soloMin[1]);
  if (tipo === "email" && /v[aá]lid[oa]|formato|email/i.test(texto)) {
    salida.pattern = "^[^\\s@]+@[^\\s@]+\\.[^@]+$";
    salida.message = "Escribe un correo electrónico válido";
  }
  return salida;
}

/* Intenta deducir el tema de la peticion. Busca patrones como "sobre X",
   "pagina web X", "sitio web X", "acerca de X". */
function extraerTopico(texto) {
  const patrones = [
    /sobre\s+(?:la\s+)?p[áa]gina\s+web\s+([^\s.,;:!?]+(?:\s+[^\s.,;:!?]+){0,3})/i,
    /sobre\s+(?:el\s+)?sitio\s+web\s+([^\s.,;:!?]+(?:\s+[^\s.,;:!?]+){0,3})/i,
    /de\s+la\s+p[áa]gina\s+web\s+([^\s.,;:!?]+(?:\s+[^\s.,;:!?]+){0,3})/i,
    /acerca\s+de\s+([^\s.,;:!?]+(?:\s+[^\s.,;:!?]+){0,3})/i,
    /sobre\s+([^\s.,;:!?]+(?:\s+[^\s.,;:!?]+){0,3})/i,
  ];
  for (const patron of patrones) {
    const m = texto.match(patron);
    if (m) return m[1].trim();
  }
  return null;
}

/* Detecta los tipos de pregunta que el autor menciona en su peticion. */
function extraerTiposMencionados(texto, es) {
  const hallados = [];
  if (/selecci[oó]n\s+[uú]nica|single.choice|radio/i.test(texto)) hallados.push(es ? "seleccion unica (radio)" : "single choice (radio)");
  if (/selecci[oó]n\s+m[uú]ltiple|multiple.choice|checkbox/i.test(texto)) hallados.push(es ? "seleccion multiple (checkbox)" : "multiple choice (checkbox)");
  if (/likert|escala\s+de\s+1\s+a\s+5|scale.*1.*5/i.test(texto)) hallados.push(es ? "escala Likert 1-5 (score_rating)" : "Likert scale 1-5 (score_rating)");
  if (/n[uú]mero\s+net\s+promoter|NPS|recomendaci[oó]n\s+de\s+0\s+a\s+10|0\s+a\s+10/i.test(texto)) hallados.push(es ? "NPS 0-10 (score_rating)" : "NPS 0-10 (score_rating)");
  if (/abiert|open.ended|texto\s+larg/i.test(texto)) hallados.push(es ? "abierto (long_text)" : "open-ended (long_text)");
  return hallados.length ? hallados.join(", ") : null;
}

/* Detecta restricciones clave del autor. */
function extraerRestricciones(texto, es) {
  const r = [];
  if (/anonim|an[oó]nim|confidencial/i.test(texto)) r.push(es ? "anonimo y confidencial" : "anonymous and confidential");
  if (/sin\s+datos\s+personales|no\s+solicite.*personal|no\s+informaci[oó]n\s+personal/i.test(texto)) r.push(es ? "sin datos personales sensibles" : "no sensitive personal data");
  if (/cubano|cubana|Cuba/i.test(texto)) r.push(es ? "contexto cubano" : "Cuban context");
  return r.length ? r.join(", ") : null;
}

/* Extrae los parametos clave de la peticion del autor. */
function condensarParaModelo(prompt, es) {
  const texto = String(prompt || "");
  const n = numeroPedido(texto);
  const topico = extraerTopico(texto);
  const tipos = extraerTiposMencionados(texto, es);
  const restricciones = extraerRestricciones(texto, es);

  let lineas = [];
  if (n > 0) lineas.push(`Genera exactamente ${n} preguntas.`);
  if (topico) lineas.push(`Tema: ${topico}.`);
  if (tipos) lineas.push(`Tipos de pregunta: ${tipos}.`);
  lineas.push(`Idioma: ${es ? "español" : "English"}.`);
  if (restricciones) lineas.push(`Restricciones: ${restricciones}.`);
  lineas.push("Devuelve un formulario completo con titulo, descripcion y las preguntas pedidas.");

  return lineas.join(" ");
}

/* Etiquetas de plantilla */
const RE_MARCADOR =
  /^(?:campo|pregunta|apartado|opci[oó]n|item|bloque|secci[oó]n|field|question|option)\s*(?:n[.ºo]*\s*)?\d*\s*(?:de\s+)?[a-záéíóúñ]*\s*(?:corto|largo|m[úu]ltiple|selecci[oó]n|s[íi]\/no|texto|opinion|abierto|cerrado|n[uú]mero)?\s*\d*$/i;

/**
 * Valida que el formulario generado coincida con la especificación exacta esperada.
 * Verifica: 15 preguntas + distribución de tipos exacta.
 * @param {Object} form - El formulario generado
 * @param {string} expectedSpec - Especificación esperada (prompt original) para extraer el tema
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validarFormulario(form, expectedSpec) {
  const errors = [];

  if (!form || !Array.isArray(form.questions)) {
    return { valid: false, errors: ['Formulario inválido: sin array de preguntas'] };
  }

  /* Filtrar solo preguntas respondibles (no estáticas) */
  const respondibles = form.questions.filter((q) => q && !STATIC_FIELD_TYPES.includes(q.type));

  /* 1. Verificar total de preguntas: 15 */
  if (respondibles.length !== 15) {
    errors.push(`Total preguntas: esperadas 15, obtenidas ${respondibles.length}`);
  }

  /* 2. Verificar distribución exacta de tipos */
  const radioCount = respondibles.filter((q) => q.type === 'radio').length;
  const checkboxCount = respondibles.filter((q) => q.type === 'checkbox').length;
  const scoreRating1to5Count = respondibles.filter((q) => q.type === 'score_rating' && q.scale && q.scale.min === 1 && q.scale.max === 5).length;
  const scoreRating0to10Count = respondibles.filter((q) => q.type === 'score_rating' && q.scale && q.scale.min === 0 && q.scale.max === 10).length;
  const longTextCount = respondibles.filter((q) => q.type === 'long_text').length;

  if (radioCount !== 3) {
    errors.push(`Radio questions: esperadas 3, obtenidas ${radioCount}`);
  }
  if (checkboxCount !== 4) {
    errors.push(`Checkbox questions: esperadas 4, obtenidas ${checkboxCount}`);
  }
  if (scoreRating1to5Count !== 5) {
    errors.push(`Score rating 1-5: esperadas 5, obtenidas ${scoreRating1to5Count}`);
  }
  if (scoreRating0to10Count !== 1) {
    errors.push(`Score rating 0-10 (NPS): esperada 1, obtenidas ${scoreRating0to10Count}`);
  }
  if (longTextCount !== 2) {
    errors.push(`Long text questions: esperadas 2, obtenidas ${longTextCount}`);
  }

  /* 3. Verificar que radio y checkbox tienen options */
  const radioSinOptions = respondibles.filter((q) => q.type === 'radio' && (!Array.isArray(q.options) || q.options.length < 2));
  const checkboxSinOptions = respondibles.filter((q) => q.type === 'checkbox' && (!Array.isArray(q.options) || q.options.length < 2));
  if (radioSinOptions.length > 0) {
    errors.push(`${radioSinOptions.length} radio question(s) without proper options`);
  }
  if (checkboxSinOptions.length > 0) {
    errors.push(`${checkboxSinOptions.length} checkbox question(s) without proper options`);
  }

  /* 4. Verificar que score_rating tienen escala */
  const scoreSinEscala = respondibles.filter((q) => q.type === 'score_rating' && (!q.scale || !q.scale.min || !q.scale.max));
  if (scoreSinEscala.length > 0) {
    errors.push(`${scoreSinEscala.length} score_rating question(s) without scale`);
  }

  return {
    valid: errors.length === 0,
    errors,
    counts: { radioCount, checkboxCount, scoreRating1to5Count, scoreRating0to10Count, longTextCount }
  };
}

/* Con `response_format: json_object` la raíz siempre es un objeto, así que una
   lista pedida como tal vuelve envuelta. */
const CLAVES_LISTA = ["questions", "items", "results", "result", "data", "entries", "list", "preguntas", "respuestas"];

export function extraerLista(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];

  for (const clave of CLAVES_LISTA) {
    if (Array.isArray(data[clave])) return data[clave];
  }

  const valores = Object.values(data);
  if (valores.length && valores.every((v) => v && typeof v === "object" && !Array.isArray(v))) {
    return valores;
  }

  return valores.find(Array.isArray) || [];
}

/**
 * Cablea la lógica condicional que el modelo escribe en prosa pero no en datos.
 * Exportada para probarla sin llamar al proveedor.
 */
export function aplicarLogicaCondicional(form) {
  const qs = form.questions;
  if (!Array.isArray(qs)) return;
  let puertas = 0;
  let condiciones = 0;

  const anteriorRespondible = (idx) => {
    for (let i = idx - 1; i >= 0; i--) {
      const q = qs[i];
      if (q && !STATIC_FIELD_TYPES.includes(q.type)) return q;
    }
    return null;
  };
  const primeraOpcionSi = (q) => {
    const etiquetas = (q.options || []).map((o) => o.label);
    const esSi = (l) => /^\s*s[ií](?![\p{L}\p{N}])/iu.test(l);
    return (
      etiquetas.find(esSi) ||
      etiquetas.find((l) => /\byes\b/i.test(l)) ||
      (q.type === "yes_no" ? "Sí" : null)
    );
  };

  qs.forEach((q, idx) => {
    if (!q || STATIC_FIELD_TYPES.includes(q.type)) return;

    if (q.type === "yes_no" && !q.isConsentGate &&
        /participar|voluntaria|consent|agree to participate|acepta participar/i.test(q.label || "")) {
      q.isConsentGate = true;
      puertas++;
    }

    if (q.visibleIf || !["short_text", "long_text", "email"].includes(q.type)) return;
    const prev = anteriorRespondible(idx);
    if (!prev) return;

    const texto = `${q.label || ""} ${q.description || ""}`;
    const cuelgaDeSi = /^(si|if)\b/i.test((q.label || "").trim()) || /s[oó]lo si|only if/i.test(texto);
    const pideOtro = /otr[oa]\b|other\b|cu[aá]l\b|especifique|specify|which one/i.test(texto);
    const etiquetasPrev = (prev.options || []).map((o) => o.label);
    const opcionOtro = etiquetasPrev.find((l) => /otr[oa]\b|other\b/i.test(l));

    if (q.type === "email") {
      const si = primeraOpcionSi(prev);
      if ((prev.type === "yes_no" || prev.type === "radio") && si) {
        q.visibleIf = { questionId: prev.id, operator: "equals", value: si };
        condiciones++;
      }
      return;
    }

    if (cuelgaDeSi) {
      const si = primeraOpcionSi(prev);
      if (!si) return;
      q.visibleIf = {
        questionId: prev.id,
        operator: prev.type === "checkbox" ? "includes" : "equals",
        value: si,
      };
      condiciones++;
      return;
    }

    if (pideOtro && opcionOtro) {
      q.visibleIf = {
        questionId: prev.id,
        operator: prev.type === "checkbox" ? "includes" : "equals",
        value: opcionOtro,
      };
      condiciones++;
    }
  });

  if (puertas || condiciones) {
    console.warn(`[ai.service] logica condicional: ${puertas} puerta(s) de consentimiento, ${condiciones} pregunta(s) condicional(es)`);
  }
}

/**
 * Una pregunta `url` que en realidad es un enlace para VISITAR no pide ningún dato.
 * Exportada para probarla sin llamar al proveedor.
 */
export function convertirEnlacesInformativos(form) {
  const qs = form.questions;
  if (!Array.isArray(qs)) return;
  let convertidas = 0;

  for (const q of qs) {
    if (!q || q.type !== "url") continue;
    const texto = `${q.label || ""} ${q.description || ""}`;
    if (!/https?:\/\//i.test(texto)) continue;
    if (!/visite|más información|mas informacion|more information|visit us|conozca más|sitio oficial|official (page|site|website)/i.test(texto)) continue;
    const contenido = [q.label, q.description].filter(Boolean).join(" ").trim();
    q.type = "message";
    q.label = "";
    q.content = contenido;
    q.description = "";
    q.required = false;
    q.options = [];
    convertidas++;
  }

  if (convertidas) {
    console.warn(`[ai.service] ${convertidas} enlace(s) informativo(s) como mensaje, no como pregunta`);
  }
}

/**
 * Garantiza que el consentimiento informado quede CONSTRUIDO, no mencionado.
 * Exportada para probarla sin llamar al proveedor.
 */
export function asegurarConsentimiento(form, prompt, language = "en") {
  if (typeof prompt !== "string") return;
  if (!/consentimiento|informed consent|acepta participar|participar[\s\S]{0,60}voluntaria|voluntary/i.test(prompt)) return;
  const qs = form?.questions;
  if (!Array.isArray(qs)) return;
  const es = language === "es";

  const esConsent = (q) =>
    q && !STATIC_FIELD_TYPES.includes(q.type) &&
    /participar|consentimiento|informed consent|acepta participar/i.test(q.label || "");
  const tienePalabras = qs.some(
    (q) => q && /consentimiento/i.test(q.label || "") && /informad[oa]/i.test(q.label || ""),
  );

  const pregunta = qs.find(esConsent);
  if (pregunta) pregunta.isConsentGate = true;
  if (pregunta && tienePalabras) return;

  const m = prompt.match(
    /^[ \t]*(?:\d{1,2}[.)]\s+)?(Introducci[oó]n\s+y\s+consentimiento\s+informado[^\n:]*)/im,
  );
  const titulo =
    (m && m[1].trim()) || (es ? "Introducción y consentimiento informado" : "Introduction and informed consent");

  let pos = 0;
  while (
    pos < qs.length &&
    (qs[pos]?.type === "paragraph" || qs[pos]?.type === "message")
  )
    pos++;

  const nuevos = [];
  if (!tienePalabras) {
    nuevos.push({ type: "section", label: titulo, content: "", required: false, options: [] });
  }
  if (!pregunta) {
    nuevos.push({
      type: "yes_no",
      label: es
        ? "¿Acepta participar en esta encuesta de forma voluntaria?"
        : "Do you agree to take part in this survey voluntarily?",
      placeholder: "",
      description: es
        ? "Su participación es voluntaria y anónima. Los datos se usarán solo para análisis agregado."
        : "Your participation is voluntary and anonymous. Data will only be used for aggregate analysis.",
      helpText: "",
      required: true,
      isConsentGate: true,
    });
  }
  if (!nuevos.length) return;

  const completos = nuevos.map((q) => ({
    id: nanoid(10),
    type: q.type,
    label: q.label || "",
    placeholder: "",
    description: q.description || "",
    helpText: "",
    required: Boolean(q.required),
    defaultValue: "",
    options: [],
    content: q.content || "",
    scale: null,
    validation: {},
    visibleIf: null,
    isConsentGate: q.isConsentGate === true && q.type === "yes_no",
  }));
  qs.splice(pos, 0, ...completos);
  qs.forEach((q, i) => {
    if (q && typeof q.order === "number") q.order = i;
  });
  console.warn(
    `[ai.service] consentimiento asegurado: ${completos.length} bloque(s) insertado(s) ("${titulo.slice(0, 50)}")`,
  );
}

/**
 * Garantiza el mensaje de cierre cuando el prompt lo pide.
 * Exportada para probarla sin llamar al proveedor.
 */
export function asegurarCierre(form, prompt, language = "en") {
  if (typeof prompt !== "string") return;
  if (
    !/al\s+final|mensaje\s+(final|de\s+cierre|de\s+agradecimiento)|closing\s+message|thank\s*you\s+message|mensaje\s+de\s+agradecimiento/i.test(
      prompt,
    )
  )
    return;
  const qs = form?.questions;
  if (!Array.isArray(qs) || !qs.length) return;
  const es = language === "es";

  const ultimos = qs.slice(-3);
  const yaCierra = ultimos.some((q) => {
    if (!q) return false;
    const texto = `${q.content || ""} ${q.label || ""}`;
    return /gracias|thank|https?:\/\//i.test(texto) && ["message", "paragraph", "section", "heading"].includes(q.type);
  });
  if (yaCierra) return;

  const url = (prompt.match(/https?:\/\/[^\s<>"')]+/i) || [])[0]?.replace(/[.,;:!?]+$/, "") || "";
  const gracias = es ? "Gracias por su tiempo y colaboración." : "Thank you for your time and collaboration.";
  const contenido = url
    ? `${gracias} ${es ? "Para más información, visite:" : "For more information, visit:"} ${url}`
    : gracias;

  qs.push({
    id: nanoid(10),
    type: "message",
    label: "",
    placeholder: "",
    description: "",
    helpText: "",
    required: false,
    defaultValue: "",
    options: [],
    content: contenido,
    scale: null,
    validation: {},
    visibleIf: null,
    isConsentGate: false,
    order: qs.length,
  });
  console.warn("[ai.service] cierre asegurado: mensaje final con agradecimiento" + (url ? " y enlace" : ""));
}

export async function generateValidation({ label, type, description = "", language = "en" }) {
  if (!label || !type)
    throw ApiError.badRequest("Field label and type are required");

  const es = language === "es";

  const schemaHint = `{
"minLength": number | null,
"maxLength": number | null,
"min": number | null,
"max": number | null,
"pattern": string,
"message": string
}`;

  const data = await generateJson(
    `Suggest sensible validation rules for a form field.
Field label: "${label}". Field type: "${type}". ${description ? `Context: ${description}.` : ""}
Provide a regex pattern when it improves data quality (e.g. phone, postal code), reasonable length/number bounds, and a friendly, specific error "message". Use null for rules that do not apply
${es ? 'Escribe el valor de CADA campo —sobre todo el mensaje de error "message"— en español; no dejes ningún texto en inglés.' : "Write every value in English."}`,
    {
      schemaHint,
      systemPrompt: es
        ? 'Eres un asistente de validación de formularios. Respondes únicamente con el objeto JSON solicitado, sin explicaciones, y SIEMPRE en español.'
        : undefined,
    },
  );

  return {
    minLength: numberOrNull(data.minLength),
    maxLength: numberOrNull(data.maxLength),
    min: numberOrNull(data.min),
    max: numberOrNull(data.max),
    pattern: typeof data.pattern === "string" ? data.pattern : "",
    message: typeof data.message === "string" ? data.message : "",
  };
}

export async function improveQuestion({ label, type = "short_text" }) {
  if (!label?.trim())
    throw ApiError.badRequest("Provide the question to improve");

  const schemaHint = `{
"improved": string,
"clarity": string,
"followUps": string[]
}`;

  const data = await generateJson(
    `Improve this ${type} survey/form question for clarity, neutrality and engagement: "${label}".
Return the rewritten question as "improved", a one-sentence note on what you improved as "clarity", and 2-3 relevant follow-up questions as "followUps".`,
    { schemaHint },
  );

  return {
    improved: data.improved || label,
    clarity: data.clarity || "",
    followUps: Array.isArray(data.followUps) ? data.followUps.slice(0, 3) : [],
  };
}

export async function summarizeForm(form, language = "en") {
  if (!form?.questions?.length) {
    throw ApiError.badRequest("Add some questions before generating a summary");
  }

  const es = language === "es";

  const outline = form.questions
    .map((q, i) => `${i + 1}. [${q.type}]${q.required ? " *" : ""} ${q.label}`)
    .join("\n");

  const schemaHint = `{
"purpose": string,
"audience": string,
"completionTime": string,
"suggestions": string[]
}`;

  const data = await generateJson(
    `Analyse this form titled "${form.title}".
Questions:\n${outline}\n
Return its likely "purpose", the target "audience", an estimated "completionTime" (e.g. "2-3 minutes"), and 3-4 concrete "suggestions" to improve completion rate and data quality.
${es ? 'Escribe el valor de CADA campo —incluido completionTime, p. ej. "2-3 minutos"— en español; no dejes ningun texto en ingles.' : "Write every value in English."}`,
    {
      schemaHint,
      systemPrompt: es
        ? "Analizas formularios y respondes unicamente con el objeto JSON solicitado, sin explicaciones, y SIEMPRE en español."
        : undefined,
    },
  );

  return {
    purpose: data.purpose || "",
    audience: data.audience || "",
    completionTime: data.completionTime || "",
    suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
  };
}

function numberOrNull(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

export { generateText };
