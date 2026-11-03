/* La auditoría que se le enseña al usuario después de generar.
 *
 * Se ejercita contra el caso REAL que falló: el formulario que produjo el
 * generador para las 176 TES (5 secciones, 10 preguntas, un solo eje temático de
 * 23) y el prompt original que el usuario escribió. Si esta auditoría no ve el
 * problema, no sirve de nada: el modal diciendo "todo bien" sobre un esqueleto es
 * justo el fallo que se quiere arreglar.
 *
 *   node qa/ai-audit.js
 */

import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

const AQUI = fileURLToPath(new URL(".", import.meta.url));
const BACKEND = path.resolve(AQUI, "..", "..", "..", "backend");
const PROMPT = path.join(
  process.env.TEMP || "C:/Users/migue/AppData/Local/Temp",
  "opencode",
  "prompt-original.txt",
);

const { auditarFormulario, elementosDelPrompt } = await import(
  pathToFileURL(path.join(BACKEND, "utils/formAudit.js")).href
);

let fallos = 0;
const eq = (real, esperado, nombre) => {
  const a = JSON.stringify(real);
  const b = JSON.stringify(esperado);
  if (a === b) console.log(`  OK    ${nombre}`);
  else {
    console.log(`  FALLO ${nombre}`);
    console.log(`          esperado ${b}`);
    console.log(`          real     ${a}`);
    fallos++;
  }
};
const cierto = (cond, nombre) => eq(!!cond, true, nombre);

/* ── el formulario que salió de verdad ── */
const FORMULARIO_QUE_FALLO = {
  title: "Encuesta sobre las Transformaciones Económicas en Cuba",
  description: "Esta encuesta tiene como objetivo recopilar opiniones sobre las 176 medidas económicas.",
  questions: [
    { type: "section", label: "Sección 0: Datos Sociodemográficos", options: [] },
    { type: "number", label: "Edad", options: [] },
    { type: "gender", label: "Género", options: [] },
    { type: "province", label: "Provincia", options: [] },
    { type: "section", label: "Sección 1: Conocimiento General de las Transformaciones", options: [] },
    { type: "rating", label: "¿Cómo calificaría su nivel de información sobre las 176 medidas?",
      description: "1 = Muy poco informado, 5 = Muy bien informado", options: [] },
    { type: "section", label: "Sección 2: Percepción sobre Sectores Específicos", options: [] },
    { type: "rating", label: "¿Cree que las empresas estatales serán más eficientes?",
      description: "1 = Muy en desacuerdo, 5 = Muy de acuerdo", options: [] },
    { type: "section", label: "Sección 3: Expectativas y Satisfacción", options: [] },
    { type: "long_text", label: "¿Cómo cree que estas medidas afectarán su economía personal?", options: [] },
    { type: "section", label: "Sección 4: Preguntas Abiertas", options: [] },
    { type: "long_text", label: "¿Tiene alguna preocupación o sugerencia?", options: [] },
  ],
};

console.log("\n── el caso real: un esqueleto con forma de encuesta ──");
const r = auditarFormulario(FORMULARIO_QUE_FALLO, "");
eq(r.secciones, 5, "cuento las 5 secciones");
eq(r.preguntas, 7, "cuento las 7 preguntas respondibles (los bloques no cuentan)");
eq(r.tipos.rating, 2, "y las dos de rating");

/* Aquí NO salta el aviso de anclas, y es lo correcto: los anclas de esas dos
   preguntas estaban escritos en la descripción ("1 = Muy en desacuerdo, 5 =
   Muy de acuerdo") y `normalizeScale` los sabe recuperar de la prosa. El
   aviso de anclas es para el otro caso, el de verdad sin ancla ninguna, que se
   comprueba más abajo. */
cierto(
  !r.avisos.some((a) => a.code === "escala_sin_anchas"),
  "no avisa de anclas: en estas dos los anclas se recuperan de la descripción",
);

console.log("\n── una escala que sí está a medias ──");
const sinAncla = auditarFormulario(
  {
    questions: [
      { type: "rating", label: "¿Qué tan de acuerdo está?", description: "Marque su grado de acuerdo.", options: [] },
      { type: "rating", label: "Otra", scale: { min: 1, max: 7 }, options: [] },
      { type: "rating", label: "Bien definida", scale: { min: 1, max: 5, minLabel: "Nada", maxLabel: "Todo" }, options: [] },
    ],
  },
  "",
);
const avisoAnclas = sinAncla.avisos.find((a) => a.code === "escala_sin_anchas");
cierto(!!avisoAnclas, "avisa cuando la escala no tiene ni rótulo ni prosa que lo delate");
eq(avisoAnclas?.campos, ["¿Qué tan de acuerdo está?", "Otra"], "y señala las dos, no la que sí los tiene");

console.log("\n── cobertura contra el prompt real del usuario ──");
if (fs.existsSync(PROMPT)) {
  const prompt = fs.readFileSync(PROMPT, "utf8");
  const elementos = elementosDelPrompt(prompt);
  console.log(`  elementos contables que se pueden comprobar: ${elementos.length}`);
  console.log(`  ${elementos.map((e) => `"${e}"`).join(", ")}`);
  eq(elementos.length, 5, "el prompt enumera cinco secciones, que es lo único contable");
  cierto(
    elementos.every((e) => !/^secci/i.test(e)),
    "y de cada una se guarda el nombre del apartado, no la palabra 'Sección'",
  );
  cierto(
    !elementos.some((e) => /aspecto|informaci[oó]n: |empresa estatal y|autonom/i.test(e)),
    "las listas en prosa ('aspectos clave') NO se cuentan: no se pueden comprobar sin dar falsos avisos",
  );

  /* Aquí la respuesta honesta es "no falta ninguna de las cinco secciones": las
     cinco estaban, con sus títulos correctos. El problema de aquel formulario
     eran las secciones vacías de contenido y las 10 preguntas de 60 que se
     pidieron, y eso no lo detecta ninguna cuenta de palabras. Se comprueba abajo,
     contra un caso donde sí falta. */
  const conPrompt = auditarFormulario(FORMULARIO_QUE_FALLO, prompt);
  cierto(
    !conPrompt.avisos.some((a) => a.code === "cobertura"),
    "no inventa un aviso de cobertura: las cinco secciones sí estaban",
  );
} else {
  console.log("  (sin el prompt original guardado: se salta esta parte)");
}

console.log("\n── cobertura: un apartado que sí falta ──");
const sinApartado = auditarFormulario(
  {
    questions: [
      { type: "section", label: "Sección 0: Datos Sociodemográficos", options: [] },
      { type: "short_text", label: "Edad", options: [] },
      { type: "section", label: "Sección 1: Conocimiento General", options: [] },
      { type: "short_text", label: "¿Conoce las medidas?", options: [] },
    ],
  },
  "Sección 0: Datos Sociodemográficos\nSección 1: Conocimiento General\nSección 2: Descentralizacion municipal",
);
const avisoFalta = sinApartado.avisos.find((a) => a.code === "cobertura");
cierto(!!avisoFalta, "avisa del apartado que el prompt pedía y no está");
eq(avisoFalta?.campos, ["Descentralizacion municipal"], "y lo nombra");

console.log("\n── un formulario bien hecho no dispara avisos ──");
const BUENO = {
  title: "Evaluación del servicio",
  questions: [
    { type: "paragraph", label: "Gracias por participar", options: [] },
    { type: "section", label: "Sección 1: Sobre el servicio", options: [] },
    { type: "rating", label: "¿Qué tan satisfecho está?", options: [],
      scale: { min: 1, max: 5, minLabel: "Nada satisfecho", maxLabel: "Muy satisfecho" } },
    { type: "radio", label: "¿Nos recomendaría?",
      options: [{ label: "Sí" }, { label: "No" }, { label: "Quizás" }] },
    { type: "section", label: "Sección 2: Otros datos", options: [] },
    { type: "long_text", label: "Comentario", options: [] },
  ],
};
const ok = auditarFormulario(BUENO, "");
eq(ok.avisos, [], "sin avisos: escala con anclas, listas con opciones, secciones con contenido");
eq(ok.secciones, 2, "dos secciones");
eq(ok.preguntas, 3, "tres preguntas");

console.log("\n── los bordes ──");
eq(auditarFormulario({ questions: [] }, "").avisos.map((a) => a.code), ["sin_preguntas"],
  "un formulario sin preguntas se señala");
eq(
  auditarFormulario(
    { questions: [{ type: "short_text", label: "A", options: [] },
      { type: "section", label: "Sección final sin nada", options: [] }] },
    "",
  ).avisos.map((a) => a.code),
  ["seccion_vacia"],
  "una sección al final sin nada debajo se señala: ahí no hay subsecciones que la sostengan",
);
eq(
  auditarFormulario(
    /* La forma en que el proveedor agrupa de verdad: una sección padre seguida de
       sus subsecciones. La padre no está vacía, se sostiene sobre ellas. */
    { questions: [
      { type: "section", label: "Sección 2: Percepción", options: [] },
      { type: "section", label: "Subsección 2.1: Empresa estatal", options: [] },
      { type: "radio", label: "¿Más eficientes?", options: [{ label: "Sí" }, { label: "No" }] },
      { type: "section", label: "Subsección 2.2: Agricultura", options: [] },
      { type: "radio", label: "¿Mejorará la producción?", options: [{ label: "Sí" }, { label: "No" }] },
    ] },
    "",
  ).avisos,
  [],
  "una sección padre seguida de subsecciones no se cuenta como vacía",
);
eq(
  auditarFormulario(
    { questions: [
      { type: "section", label: "Sección 1: Datos", options: [] },
      { type: "short_text", label: "Edad", options: [] },
      { type: "section", label: "Sección 2: Conocimiento", options: [] },
      { type: "radio", label: "¿Conoce las medidas?", options: [{ label: "Sí" }, { label: "No" }] },
    ] },
    "",
  ).avisos,
  [],
  "secciones bien repartidas: ningún aviso",
);
eq(auditarFormulario({ questions: [{ type: "radio", label: "A", options: [] }] }, "").avisos.map((a) => a.code),
  ["sin_opciones"], "una lista sin opciones se señala");
eq(elementosDelPrompt("Solo es una frase suelta sin lista."), [],
  "un prompt en prosa no inventa una lista de elementos");
eq(auditarFormulario(BUENO, "Solo es una frase suelta sin lista.").avisos, [],
  "y entonces no se dice nada de cobertura");

console.log(fallos === 0 ? "\nTODO CORRECTO" : `\n${fallos} FALLO(S)`);
process.exit(fallos === 0 ? 0 : 1);
