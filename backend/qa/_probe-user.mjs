// Sonda: el prompt largo con la especificacion + ejemplo json que reporto el autor.
import { generateForm } from "../services/ai.service.js";

const prompt = `Actúa como un generador de formularios para un sitio web.

Genera UN formulario con exactamente 10 preguntas sobre el tema:
"evaluación de la experiencia de compra en una tienda online".

Usa exactamente este título:
"Encuesta de experiencia de compra online"

Usa exactamente esta descripción:
"Formulario para evaluar la navegación, el proceso de pago y la satisfacción general con la compra online."

Requisitos obligatorios:
1. El formulario debe tener exactamente 10 preguntas, ni más ni menos.
2. No inventes otro título ni otra descripción; usa los textos indicados literalmente.
3. Las preguntas deben ser claras, breves y en español neutro.
4. Usa al menos 7 tipos distintos entre estas opciones:
   "text", "textarea", "select", "radio", "checkbox", "number", "scale", "boolean", "date".
5. Asigna los ids en orden: q1, q2, q3, q4, q5, q6, q7, q8, q9 y q10.
6. Cada pregunta debe incluir: id, label, type, required, options y validation.
7. Si una pregunta no usa "options", devuelve un arreglo vacío [].
8. Si una pregunta no usa "validation", devuelve un objeto vacío {}.
9. No repitas preguntas ni uses temas ambiguos.
10. Devuelve SOLO un JSON válido, sin explicaciones, sin Markdown y sin bloques de código.

Formato exacto de salida:
{
  "title": "Encuesta de experiencia de compra online",
  "description": "Formulario para evaluar la navegación, el proceso de pago y la satisfacción general con la compra online.",
  "questions": [
    {
      "id": "q1",
      "label": "Texto de la pregunta",
      "type": "text",
      "required": true,
      "options": [],
      "validation": {
        "minLength": 2,
        "maxLength": 120
      }
    }
  ]
}

Tipos permitidos para "type":
"text", "textarea", "select", "radio", "checkbox", "number", "scale", "boolean", "date".`;

console.time("TOTAL");
try {
  const form = await generateForm(prompt, "es");
  console.log("OK ->", JSON.stringify({
    title: form.title,
    description: form.description,
    n: form.questions?.length,
    questions: form.questions?.map((q) => `${q.type}: ${q.label || q.content?.slice(0, 40)}`),
    aiNotes: form.aiNotes,
  }, null, 2));
} catch (e) {
  console.log("ERROR ->", e.name, "|", e.message, "| status:", e.status, "| code:", e.code);
  if (e.details) console.log("details:", e.details);
  console.log(e.stack?.split("\n").slice(0, 6).join("\n"));
}
console.timeEnd("TOTAL");
