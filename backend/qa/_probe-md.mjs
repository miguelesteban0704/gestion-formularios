// Sonda temporal: el prompt del autor en markdown, sin json.
import { generateForm } from "../services/ai.service.js";

const prompt = `Actúa como un diseñador de encuestas senior especializado en experiencia de usuario y análisis de datos. Necesito que generes un formulario de encuesta completo, listo para publicar, con la siguiente estructura exacta. No agregues preguntas adicionales, no omitas ninguna, y no cambies los nombres solicitados.

## Título del formulario
Encuesta de Satisfacción del Servicio

## Descripción del formulario
Breve encuesta para conocer tu nivel de satisfacción con el servicio recibido. Tus respuestas nos ayudarán a mejorar la atención y la calidad. Solo te tomará menos de 2 minutos completarla.

## Estructura de las 6 preguntas

Genera exactamente estas 6 preguntas, en este orden, con el nombre indicado y el tipo de campo especificado:

### Pregunta 1
- **Nombre:** Nombre completo
- **Tipo:** Texto corto
- **Obligatoria:** Sí
- **Orientación:** Escribe tu nombre y apellidos tal como aparecen en tu documento de identidad.

### Pregunta 2
- **Nombre:** Correo electrónico
- **Tipo:** Correo electrónico
- **Obligatoria:** Sí
- **Orientación:** Usaremos este correo solo para contactarte si es necesario.

### Pregunta 3
- **Nombre:** ¿Cómo calificarías tu nivel de satisfacción general con el servicio?
- **Tipo:** Escala lineal del 1 al 5
- **Obligatoria:** Sí
- **Orientación:** Selecciona el número que mejor represente tu experiencia, donde 1 es "Muy insatisfecho" y 5 es "Muy satisfecho".

### Pregunta 4
- **Nombre:** ¿Qué aspectos del servicio valoras más?
- **Tipo:** Selección múltiple
- **Obligatoria:** Sí
- **Orientación:** Puedes seleccionar más de una opción entre: rapidez en la atención, amabilidad del personal, claridad de la información, facilidad de los trámites y disponibilidad de canales digitales.

### Pregunta 5
- **Nombre:** ¿Recomendarías este servicio a otra persona?
- **Tipo:** Opción única
- **Obligatoria:** Sí
- **Orientación:** Selecciona una sola opción entre: Sí, No o Tal vez.

### Pregunta 6
- **Nombre:** ¿Qué sugerencias tienes para mejorar el servicio?
- **Tipo:** Texto largo
- **Obligatoria:** No
- **Orientación:** Comparte cualquier idea, comentario o sugerencia que nos ayude a mejorar. Tu opinión es muy valiosa.

## Reglas estrictas

- No agregues preguntas adicionales ni elimines ninguna de las 6.
- No cambies los nombres, tipos ni el orden.
- Respeta las orientaciones de cada pregunta.
- Mantén el tono profesional, claro y cercano.`;

console.log("longitud:", prompt.length, "caracteres");
console.time("TOTAL");
const form = await generateForm(prompt, "es");
console.timeEnd("TOTAL");

console.log("\nTitulo:     ", JSON.stringify(form.title));
console.log("Descripcion:", JSON.stringify(form.description));
console.log("Bloques:    ", form.questions.length);

for (const [i, q] of form.questions.entries()) {
  console.log(`\n  ${i + 1}. [${q.type}] ${JSON.stringify(q.label)}`);
  console.log(`     obligatoria=${q.required}`);
  if (q.options?.length) console.log(`     opciones: ${q.options.map((o) => o.label).join(" | ")}`);
  if (q.scale) console.log(`     escala: ${q.scale.min}-${q.scale.max} "${q.scale.minLabel}" - "${q.scale.maxLabel}"`);
  if (q.description) console.log(`     orientacion: ${q.description.slice(0, 70)}`);
}

const espera = ["short_text", "email", "score_rating", "checkbox", "radio", "long_text"];
const fallos = [];
if (form.questions.length !== 6) fallos.push(`bloques=${form.questions.length} (esperado 6)`);
form.questions.forEach((q, i) => {
  if (q.type !== espera[i]) fallos.push(`P${i + 1} tipo=${q.type} esperado=${espera[i]}`);
  if (!q.id) fallos.push(`P${i + 1} sin id`);
});
if (form.title !== "Encuesta de Satisfacción del Servicio") fallos.push("titulo incorrecto");
if (!form.description.startsWith("Breve encuesta para conocer")) fallos.push("descripcion incorrecta");
if (form.questions[3].options.length !== 5) fallos.push(`P4 opciones=${form.questions[3].options.length} esperado 5`);
if (form.questions[4].options.length !== 3) fallos.push(`P5 opciones=${form.questions[4].options.length} esperado 3`);
if (form.questions[2].scale?.minLabel !== "Muy insatisfecho") fallos.push(`P3 minLabel=${form.questions[2].scale?.minLabel}`);
if (form.questions[2].scale?.maxLabel !== "Muy satisfecho") fallos.push(`P3 maxLabel=${form.questions[2].scale?.maxLabel}`);
if (form.questions[5].required !== false) fallos.push("P6 deberia ser opcional");

console.log(fallos.length ? `\nFALLOS:\n - ${fallos.join("\n - ")}` : "\nSONDA: 6 PREGUNTAS EXACTAS, TIPOS, ORDEN, OPCIONES Y ESCALA");
process.exit(fallos.length ? 1 : 0);