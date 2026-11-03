/* El reparto de tipos, que es donde el generador fallaba sin que se notara.
 *
 *   node qa/ai-types.js
 *
 * Por qué existe esto: el prompt le dice al modelo que prefiera preguntas cerradas
 * y responde con escalas. Medido contra el proveedor real dos veces, 41 escalas
 * sobre 75 preguntas y luego 54 sobre 92, con 8 cerradas en todo el formulario.
 * Una encuesta así no se puede tabular: no hay nada que contar.
 *
 * Por eso el tope se aplica en código y no en el prompt. Esta prueba fija esa
 * regla sin llamar a nadie, y con casos que salen de la salida real.
 */

import path from "node:path";
import { pathToFileURL } from "node:url";

const BACKEND = path.resolve(import.meta.dirname, "..", "..", "..", "backend");

/* Se importa el servicio entero porque `rebalancearTipos` vive dentro de
   `assembleForm`, que llama al proveedor. Para poder probarla suelta se expone
   aquí; el día que se convierta en módulo propio esto se puede quitar. */
const mod = await import(
  pathToFileURL(path.join(BACKEND, "services/ai.service.js")).href
);

let fallos = 0;
let total = 0;

function eq(real, esperado, que) {
  total++;
  const a = JSON.stringify(real);
  const b = JSON.stringify(esperado);
  if (a === b) console.log(`  OK    ${que}`);
  else {
    fallos++;
    console.log(`  FALLO ${que}`);
    console.log(`          esperado ${b}`);
    console.log(`          real     ${a}`);
  }
}

const { rebalancearTipos, repartirPorSeccion, acotarObligatorias } = mod;

/* Una pregunta de cada tipo, con el mínimo imprescindible. */
const p = (type, label, extra = {}) => ({ type, label, description: "", required: false, options: [], scale: null, ...extra });

const nRating = (n, prefijo = "¿Qué tal?") =>
  Array.from({ length: n }, (_, i) => p("rating", `${prefijo} número ${i + 1}`));

console.log("── el caso real: 54 escalas sobre 92 ──");
{
  const qs = [
    ...Array.from({ length: 30 }, (_, i) => p("radio", `¿Qué medida ${i} conoce?`)),
    ...nRating(54, "¿Qué cree de la medida"),
    ...Array.from({ length: 8 }, (_, i) => p("long_text", `¿Por qué ${i}?`)),
  ];

  const out = rebalancearTipos(qs);
  const cuentan = (t) => out.filter((q) => q.type === t).length;
  const tope = Math.ceil(92 * 0.3);
  eq(cuentan("rating"), tope, `las escalas bajan al 30%: ${cuentan("rating")}`);
  /* Las 30 radio originales se conservan, y encima llegan 26 convertidas: el
     objetivo es que el formulario sea tabulable, no que no crezca. */
  eq(cuentan("radio"), 56, "las 30 cerradas originales siguen ahí y suman 26 convertidas");
  eq(out.length, qs.length, "no se pierde ninguna pregunta");
  eq(out.every((q) => q.scale === null), true, "la escala borrada no viaja muerta");
}

console.log("\n── una encuesta sana no se toca ──");
{
  const qs = [...nRating(3), ...Array.from({ length: 7 }, () => p("radio", "¿Sí o no?"))];
  const copia = JSON.parse(JSON.stringify(qs));
  const out = rebalancearTipos(qs);
  eq(out, copia, "3 escalas entre 10 preguntas: ni se toca");
}

console.log("\n── el mínimo absoluto ──");
{
  /* Con 10 preguntas, el 30% serían 3, pero una encuesta de 10 con 3 escalas
     está bien y una con 4 empieza a ser un muro. El mínimo de 4 protege el
     caso pequeño. */
  const qs = [...nRating(4), ...Array.from({ length: 6 }, () => p("radio", "¿Sí?"))];
  const out = rebalancearTipos(qs);
  eq(out.filter((q) => q.type === "rating").length, 4, "4 escalas en 10 preguntas se quedan: es el mínimo");
}

console.log("\n── un hecho disfrazado de escala vuelve a ser sí o no ──");
{
  /* 18 respondibles: el tope es 6. Hay 8 escalas, así que sobran 2, y las dos
     primeras que sobran son justamente las de conocimiento. Se comprueba que van
     primero a `yes_no` y no a `radio`: una pregunta de hecho tiene sus dos
     respuestas fijas y no necesita que le inventen una lista. */
  const qs = [
    ...Array.from({ length: 10 }, (_, i) => p("radio", `¿Qué sector ${i}?`)),
    ...nRating(4),
    p("rating", "¿Ha oído hablar de la Ley 177?"),
    p("rating", "¿Conoce el Decreto 160?"),
    ...nRating(2),
  ];
  const out = rebalancearTipos(qs);
  eq(out.filter((q) => q.type === "yes_no").length, 2, "las dos de conocimiento son sí/no, no radio");
  eq(out.filter((q) => q.type === "rating").length, 6, "y las escalas se quedan en el tope");
}

console.log("\n── cuando no sobran escalas, no hace nada ──");
{
  const qs = [...Array.from({ length: 20 }, () => p("radio", "¿Qué?"))];
  eq(rebalancearTipos(qs), qs, "todo cerradas: se devuelve tal cual");
}

console.log("\n── solo bloques estáticos ──");
{
  const qs = [p("section", "Sección"), p("paragraph", "", { content: "texto" })];
  eq(rebalancearTipos(qs), qs, "un formulario sin preguntas no se rompe");
}

/* El reparto de enunciados entre secciones es lo que decide dónde acaba cada
   pregunta, y el fallo que produce no se ve en el formulario: las preguntas
   aparecen, pero debajo del titulo que no les toca. El caso real fue una
   "Preguntas Abiertas" al final del indice sin nada debajo, con sus preguntas
   repartidas por las secciones de arriba. */

const INDICE = [
  { num: "1", titulo: "Datos" },
  { num: "2", titulo: "Percepción" },
  { num: "2.1", titulo: "Empresa estatal" },
  { num: "3", titulo: "Preguntas Abiertas" },
];

console.log("\n── coincidencia exacta de número de sección ──");
{
  const { porSeccion, huerfanos, vacias } = repartirPorSeccion(INDICE, [
    { seccion: "1", texto: "¿Qué edad tiene?" },
    { seccion: "2.1", texto: "¿Cree que mejorará?" },
    { seccion: "3", texto: "¿Qué cambiaría?" },
  ]);
  eq(porSeccion.get("1").length, 1, "la 1 se lleva su enunciado");
  eq(porSeccion.get("2.1").length, 1, "la 2.1 se lleva el suyo y no el de su madre");
  eq(porSeccion.get("3").length, 1, "la 3, que es la última, también");
  eq(huerfanos.length, 0, "nada se queda fuera");
  eq(vacias, [], "ninguna vacía: la 2 no tiene preguntas pero tiene hija, así que no cuenta");
}

console.log("\n── una cabecera de grupo no cuenta como vacía ──");
{
  const indice = [{ num: "1", titulo: "Grupo" }, { num: "1.1", titulo: "Hija" }];
  const { vacias } = repartirPorSeccion(indice, [{ seccion: "1.1", texto: "¿Algo?" }]);
  eq(vacias.map((s) => s.num), [], "una sección con subsecciones no está vacía aunque no tenga preguntas propias");
}

console.log("\n── la numeración de más niveles cae en la sección más cercana ──");
{
  /* El modelo numeró en tres niveles cuando el índice tenía dos. Sin esta
     búsqueda, sus preguntas irían a la sección padre y las hijas quedarían
     vacías. */
  const { porSeccion } = repartirPorSeccion(INDICE, [
    { seccion: "2.1.3", texto: "¿Y el detalle?" },
  ]);
  eq(porSeccion.get("2.1.3"), undefined, "no hay una sección 2.1.3 que se llame así");
  eq(porSeccion.get("2.1").length, 1, "cae en la 2.1, que es el prefijo más largo que existe");
  eq(porSeccion.get("2").length, 0, "y no en la 2, que también es prefijo pero más corto");
}

console.log("\n── lo que no reconoce ninguna sección se queda fuera, a la vista ──");
{
  const { huerfanos, vacias } = repartirPorSeccion(INDICE, [{ seccion: "9", texto: "¿Perdida?" }]);
  eq(huerfanos.length, 1, "no se cuela en una sección cualquiera");
  /* La 2 se salva por tener a la 2.1 debajo, así que la que se queda sin nada es
     la hija. Es lo que hace que la reparación pida exactamente lo que falta. */
  eq(vacias.map((s) => s.num), ["1", "2.1", "3"], "las secciones sin nada se ven, que es lo que dispara la reparación");
}

/* Las obligatorias son el mismo problema que las escalas: el prompt pide "solo lo
   imprescindible", el modelo marca casi todo, y contra el prompt real de las 176
   TES salieron 54 obligatorias sobre 75. Una encuesta que se abandona en la
   pregunta 12 no es una encuesta. */

console.log("\n── el caso real: 54 obligatorias sobre 75 ──");
{
  const qs = [
    ...Array.from({ length: 20 }, (_, i) => p("radio", `¿Dato ${i}?`, { required: true })),
    ...Array.from({ length: 34 }, (_, i) => p("rating", `¿Opión ${i}?`, { required: true })),
    ...Array.from({ length: 21 }, (_, i) => p("long_text", `¿Abierta ${i}?`)),
  ];
  const out = acotarObligatorias(qs);
  eq(out.filter((q) => q.required).length, Math.ceil(75 * 0.25), "bajan al 25%");
  eq(out.length, 75, "no se pierde ninguna pregunta");
  /* Las que quedan son las primeras: los datos de identificación van al principio
     por convención, así que "las primeras que se salvan" coincide con las que de
     verdad hacen falta. */
  eq(out.findIndex((q) => !q.required), 19, "la primera relajada es la número 20");
}

console.log("\n── una encuesta normal no se toca ──");
{
  const qs = [
    ...Array.from({ length: 5 }, (_, i) => p("short_text", `Dato ${i}`, { required: true })),
    ...Array.from({ length: 15 }, (_, i) => p("long_text", `Abierta ${i}`)),
  ];
  const copia = JSON.parse(JSON.stringify(qs));
  eq(acotarObligatorias(qs), copia, "5 obligatorias sobre 20: lo que ya es poco, se queda");
}

console.log("\n── el mínimo absoluto cubre la encuesta corta ──");
{
  const qs = Array.from({ length: 8 }, (_, i) => p("radio", `¿${i}?`, { required: true }));
  const out = acotarObligatorias(qs);
  eq(out.filter((q) => q.required).length, 3, "8 de 8 no se puede: el mínimo es 3, no el 25%");
}

console.log("\n── sin obligatorias no hace nada ──");
{
  const qs = Array.from({ length: 30 }, (_, i) => p("long_text", `¿${i}?`));
  eq(acotarObligatorias(qs), qs, "una encuesta sin obligatorias es normal y se deja como está");
}

console.log("\n── los bloques estáticos ni cuentan ni se tocan ──");
{
  const qs = [
    p("section", "Sección"),
    ...Array.from({ length: 20 }, (_, i) => p("radio", `¿${i}?`, { required: true })),
  ];
  const out = acotarObligatorias(qs);
  eq(out.filter((q) => q.required).length, 5, "el tope se calcula sobre las respondibles, no sobre los bloques");
  eq(out[0].type, "section", "y la sección sigue ahí");
}

console.log(`\n${fallos === 0 ? "TODO CORRECTO" : `${fallos} FALLO(S)`} — ${total} comprobaciones`);
process.exit(fallos === 0 ? 0 : 1);
