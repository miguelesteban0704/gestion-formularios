/**
 * Que dice la verdad sobre lo que ha salido de la generación.
 *
 * El síntoma que motivó esto: el generador devolvía 15 bloques (5 secciones y 10
 * preguntas) para un prompt que pedía 23 ejes temáticos, y el modal celebraba
 * "✨ Formulario generado". Nada en el camino miraba lo que había salido, así
 * que un formulario esqueleto se veía exactamente igual que uno completo.
 *
 * Todo lo de aquí es una cuenta sobre el resultado, no una opinión del modelo:
 * se cuentan secciones, se buscan secciones sin preguntas debajo, se buscan
 * listas sin opciones y escalas sin anclas. Si algo de eso falla, se dice con
 * nombre y apellidos, porque son cosas que el autor puede arreglar en un minuto.
 *
 * Lo que NO se hace aquí es inventar una nota de "cobertura": un generador que
 * se autopuntúa con una heurística avisa de falsos positivos, y un aviso que
 * salta cuando no toca enseña a ignorar todos los avisos. La cobertura se
 * arregla en el prompt, no se mide aquí con unayarda de palabras.
 */

import { OPTION_FIELD_TYPES, STATIC_FIELD_TYPES } from "./constants.js";
import { normalizeScale } from "./formNormalize.js";

/** Palabras vacías en español e inglés: no describen nada del formulario. */
const VACIAS = new Set([
  "para", "como", "mas", "pero", "sus", "este", "esta", "estos", "estas", "sobre", "entre",
  "cada", "donde", "cuando", "cuanto", "porque", "tambien", "deben", "deberia", "deberian",
  "seccion", "secciones", "apartado", "apartados", "pregunta", "preguntas", "tipo", "tipos",
  "ejemplo", "ejemplos", "medida", "medidas", "forma", "formas", "datos", "dato", "caso", "casos",
  "the", "and", "for", "with", "that", "this", "these", "those", "from", "into", "each", "every",
  "should", "must", "have", "has", "are", "was", "were", "section", "sections", "question",
  "questions", "type", "types", "example", "examples", "measure", "measures", "case", "cases",
  "please", "make", "give", "use", "using", "very", "much", "many", "some", "any", "all",
]);

/** Sin acentos y en minúsculas, para que "política" y "politica" sean la misma. */
function plano(texto) {
  return String(texto ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Palabras que de verdad describen un tema, de un texto. */
function significativas(texto) {
  return plano(texto)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((p) => p.length >= 5 && !VACIAS.has(p));
}

/**
 * Los elementos que el prompt del usuario dejó por escrito de forma CONTABLE.
 *
 * Solo se cuentan tres cosas: viñetas, listas numeradas y marcadores de
 * apartado ("Sección 3: ...", "Eje 2: ...", "Tema 1: ..."). Son las únicas en
 * las que se puede afirmar sin mentir que un elemento falta, porque el elemento
 * tiene un nombre propio que se busca literal en el formulario.
 *
 * Deliberadamente NO se cuentan las listas en prosa. Un prompt de encuesta
 * típico dice "asegúrate de cubrir los siguientes aspectos clave" y a
 * continuación escribe ocho líneas como "Nivel de información: ¿está al
 * tanto?". Buscar esas palabras en el formulario da falsos avisos constantes:
 * la pregunta del formulario no dice "Nivel de información" sino "¿Conoce usted
 * las medidas?", y el aviso sale aunque el eje esté perfectamente cubierto. Un
 * aviso que salta cuando no toca enseña a ignorar los avisos, y entonces este
 * módulo deja de servir para nada. Aquí se prefiere callar antes que avisar.
 *
 * Lo que la auditoría NO puede detectar es "salió demasiado corto": no hay forma
 * honesta de compararlo con una expectativa que el usuario no escribió de forma
 * comparable. Eso se arregla en el prompt, no aquí.
 */
export function elementosDelPrompt(prompt) {
  if (typeof prompt !== "string") return [];
  const out = [];
  for (const linea of prompt.split(/\r?\n/)) {
    const limpio = linea.trim();
    if (limpio.length < 4 || limpio.length > 300) continue;

    let texto = null;
    if (/^[-*•·–—]\s+\S/.test(limpio)) {
      texto = limpio.replace(/^[-*•·–—]\s+/, "");
    } else if (/^\d{1,2}[.)]\s+\S/.test(limpio)) {
      texto = limpio.replace(/^\d{1,2}[.)]\s+/, "");
    } else {
      /* "Sección 3: Conocimiento" -> el elemento es "Conocimiento". La palabra
         "Sección" no dice de qué va el apartado, y además sale siempre en todos
         los elementos, así que no aporta nada al buscar. */
      const apartado = limpio.match(
        /^(?:secci[oó]n|section|apartado|eje|theme|tema|topic|bloque|block|part)\s*\d{0,3}\s*[:.—-]\s*(.+)$/i,
      );
      if (apartado) texto = apartado[1];
    }
    if (!texto) continue;

    /* Se queda con lo que va hasta el primer dos puntos o el primer paréntesis,
       lo que aparezca antes: "Sección 2: Percepción sobre Sectores (dividir en
       A, B y C)" -> el elemento es "Percepción sobre Sectores", que es lo
       comprobable. El orden importa: en esa línea el dos puntos está DENTRO del
       paréntesis, y cortar por dos puntos primero se llevaba la lista entera. */
    texto = texto.split(/[:(]/)[0].trim();
    if (significativas(texto).length >= 1) out.push(texto);
  }
  return out;
}

/**
 * Cuenta cuántos de los elementos escritos por el usuario tienen su reflejo en el
 * formulario. No es una nota de calidad: es una cuenta de palabras encontradas,
 * y por eso la respuesta es fidedigna en los dos sentidos — si dice que faltan
 * tres, es que tres palabras no aparecen por ningún lado.
 */
function cobertura(elementos, form) {
  if (elementos.length === 0) return null;

  const textoFormulario = plano(
    [
      form.title,
      form.description,
      ...(form.questions || []).flatMap((q) => [
        q.label,
        q.description,
        q.content,
        ...(q.options || []).map((o) => o.label),
      ]),
    ].join(" \n "),
  );

  const faltan = elementos.filter((el) => {
    const palabras = significativas(el);
    if (palabras.length === 0) return false;
    /* La mayoría tiene que estar: un solo generico como "medidas" no convierte
       un elemento en "cubierto", porque aparece en todos. */
    const encontradas = palabras.filter((p) => textoFormulario.includes(p)).length;
    return encontradas / palabras.length < 0.5;
  });

  return { total: elementos.length, faltan };
}

/**
 * Secciones sin ninguna pregunta respondible debajo, hasta la siguiente sección.
 *
 * Una sección vacía no es un error de sintaxis: es una promesa al lector ("aquí
 * se mide X") que no cumple nada. Es exactamente el aspecto que hace que una
 * encuesta parezca un esqueleto aunque el número de preguntas cuadre.
 *
 * Salvedad medida contra el proveedor real: una sección seguida inmediatamente de
 * otra NO está vacía, es una cabecera de grupo. El modelo agrupa así ("Sección
 * 2: Percepción sobre Sectores" seguido de "Subsección 2.1: Empresa Estatal",
 * "2.2: Agricultura", …) y contar la padre como vacía era un falso positivo en
 * todas las encuestas jerárquicas, que es justo donde más agrupación hay.
 *
 * El caso límite que esto no distingue: una sección vacía en medio a la que el
 * modelo se saltó y a la que le siguió otra sin querer. Se lee como cabecera y no
 * se avisa. Se prefiere ese fallo al contrario, porque un aviso que salta en
 * todas las encuestas con subsecciones acaba siendo ignorado por todos.
 */
function seccionesVacias(questions) {
  const vacias = [];
  let tituloActual = null;
  let hayAlgo = false;

  for (const q of questions) {
    if (q.type === "section") {
      /* Al llegar a una sección nueva se cierra la pendiente. Si no tenía nada
         debajo, lo que viene ahora es su propia subsección: era una cabecera y
         no una promesa incumplida, así que no se anota. Solo se guarda la
         nueva. */
      tituloActual = q.label || q.content || "";
      hayAlgo = false;
      continue;
    }
    if (STATIC_FIELD_TYPES.includes(q.type)) continue;
    hayAlgo = true;
  }

  /* Queda sin cerrar únicamente la última: si el formulario se acaba ahí, no
     había subsecciones que la sostuvieran y sí es una promesa sin cumplir. */
  if (tituloActual && !hayAlgo) vacias.push(tituloActual);

  return vacias;
}

export function auditarFormulario(form, prompt = "") {
  const questions = Array.isArray(form?.questions) ? form.questions : [];
  const secciones = questions.filter((q) => q.type === "section");
  const respondibles = questions.filter((q) => !STATIC_FIELD_TYPES.includes(q.type));

  const sinOpciones = questions.filter(
    (q) => OPTION_FIELD_TYPES.includes(q.type) && (q.options?.length ?? 0) < 2,
  );

  /* Una escala sin rótulos se dibuja, pero no significa nada: "3" no dice si es
     bueno o malo. Se cuenta aparte porque se arregla de otra manera (poniendo los
     anclas) que es un desplegable con una sola opción.
     Las estrellas de calidad (`quality_rating`) no entran aquí a propósito: con
     o sin rótulos, más estrellas siempre es mejor y se entienden solas. */
  const escalasSinAnclas = questions.filter((q) => {
    if (q.type !== "rating" && q.type !== "score_rating") return false;
    const s = normalizeScale(q.scale, q.description);
    return !s.minLabel && !s.maxLabel;
  });

  /* Cada aviso lleva `total` y `campos` con la misma forma, para que quien lo
     pinte no tenga que adivinar el tipo de cada código: cuenta con `total` y
     nombra con `campos`. El texto de `detalle` es solo para el log del servidor —
     sale siempre en español y la interfaz puede estar en inglés, así que el
     frontend construye su frase a partir de `code`. */
  const avisos = [];

  if (respondibles.length === 0) {
    avisos.push({
      code: "sin_preguntas",
      total: 0,
      campos: [],
      detalle: "El formulario no contiene ninguna pregunta respondible.",
    });
  }
  if (sinOpciones.length > 0) {
    avisos.push({
      code: "sin_opciones",
      total: sinOpciones.length,
      campos: sinOpciones.map((q) => q.label),
      detalle: `${sinOpciones.length} pregunta(s) de lista sin opciones utilizables.`,
    });
  }
  if (escalasSinAnclas.length > 0) {
    avisos.push({
      code: "escala_sin_anchas",
      total: escalasSinAnclas.length,
      campos: escalasSinAnclas.map((q) => q.label),
      detalle: `${escalasSinAnclas.length} escala(s) sin rótulo en los extremos: quien las conteste no sabrá qué significa cada número.`,
    });
  }
  const vacias = seccionesVacias(questions);
  if (vacias.length > 0) {
    avisos.push({
      code: "seccion_vacia",
      total: vacias.length,
      campos: vacias,
      detalle: `${vacias.length} sección(es) sin ninguna pregunta debajo.`,
    });
  }

  const cub = cobertura(elementosDelPrompt(prompt), form);
  if (cub && cub.faltan.length > 0) {
    avisos.push({
      code: "cobertura",
      total: cub.faltan.length,
      /* `de` separa "faltan" de "de las que había"; el frontend lo lee para
         decir "3 de las 9 que pediste" sin tener que saber nada del contrato. */
      de: cub.total,
      campos: cub.faltan,
      detalle: `${cub.faltan.length} de los ${cub.total} elementos que listaste en el prompt no aparecen en el formulario.`,
    });
  }

  return {
    preguntas: respondibles.length,
    secciones: secciones.length,
    tipos: respondibles.reduce((acc, q) => {
      acc[q.type] = (acc[q.type] || 0) + 1;
      return acc;
    }, {}),
    avisos,
  };
}
