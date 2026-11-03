export const FIELD_TYPES = [
  "short_text",
  "long_text",
  "email",
  "phone",
  "number",
  "dropdown",
  "radio",
  "checkbox",
  "date",
  "time",
  "rating",
  "quality_rating",
  "score_rating",
  "rank",
  "file",
  "yes_no",
  "address",
  "province",
  "municipality",
  "gender",
  "education_level",
  "url",
  "password",
  "section",
  "heading",
  "paragraph",
  "message",
  "image",
];

export const STATIC_FIELD_TYPES = ["section", "heading", "paragraph", "image", "message"];
/* Los tres tipos de escala: la Likert neutra (`rating`, sin juicio de valor),
   las estrellas de calidad (`quality_rating`, más es mejor) y el puntaje
   numérico (`score_rating`). Los tres guardan `scale` y se promedian igual en
   la analítica; solo cambia cómo se pintan. */
export const RATING_TYPES = ["rating", "quality_rating", "score_rating"];
/* `rank` entra aquí porque también es un catálogo cerrado: lo que se puede
   ordenar son exactamente las opciones, y sin esa lista no hay nada que
   ordenar. Comparte con el resto la interfaz de opciones, el aviso de "sin
   opciones" y la reparación automática de la IA. La validación de la respuesta
   lo trata aparte, porque un ranking es un ARRAY ordenado de etiquetas y no una
   etiqueta suelta. */
export const OPTION_FIELD_TYPES = ["dropdown", "radio", "checkbox", "rank"];
export const FORM_STATUS = ["draft", "published"];

/* Los cuatro campos "de catálogo" que ya vienen diseñados en el constructor: su
   lista de opciones no la escribe nadie —ni el autor ni el modelo—, la sirve la
   aplicación (provincias y municipios de Cuba, sexo, escolaridad). Cuando la IA
   describe una pregunta así devuelve un desplegable genérico con ese nombre
   ("Provincia", "Municipio", "Sexo", "Nivel de escolaridad"), y eso NO es el
   campo diseñado: es un desplegable con opciones inventadas que no coincide con
   el que el constructor ofrece. `catalogTypeFor` lo reconoce por la etiqueta
   para poder cambiarlo por el tipo real.

   El render público ya lo hacía a su manera (`getSpecialFieldType` en
   `lib/fieldTypes.js`), y la analítica y la validación de respuestas lo daban por
   catálogo sin que el tipo lo fuera: tres criterios para lo mismo. Aquí está el
   único. */
export const CATALOG_FIELD_TYPES = ["province", "municipality", "gender", "education_level"];

const PATRONES_CATALOGO = [
  [/municipio|municipality/, "municipality"],
  [/provincia|province/, "province"],
  [/g[eé]nero|sexo|gender/, "gender"],
  [/escolaridad|educaci[oó]n|educativo|educativa|education/, "education_level"],
];

/** El tipo de catálogo que nombra una etiqueta ("¿En qué provincia vives?"), o null. */
export function catalogTypeFor(label) {
  const texto = String(label || "").toLowerCase();
  if (!texto) return null;
  for (const [patron, tipo] of PATRONES_CATALOGO) if (patron.test(texto)) return tipo;
  return null;
}

export const THEMES = [
  "minimal",
  "modern",
  "corporate",
  "gradient",
  "dark",
  "glassmorphism",
];
