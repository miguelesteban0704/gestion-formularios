// Sonda: la lista numerada de campos se parsea en cero llamadas al modelo.
import { generateForm } from "../services/ai.service.js";

const prompt = `Actúa como un generador de formularios para un sitio web.
Genera UN formulario con exactamente 10 preguntas sobre las 176 medidas.
Título del formulario: "Consulta Ciudadana: Opinión sobre las 176 medidas"
Descripción: "Esta encuesta recoge la opinión de la ciudadanía sobre las 176 nuevas medidas."
Campo 1: \`province\` (Provincia de residencia)
Campo 2: \`municipality\` (Municipio de residencia)
Campo 3: \`radio\` (Nivel de conocimiento general sobre el paquete de 176 medidas: "Alto", "Medio", "Bajo", "Ninguno")
Campo 4: \`checkbox\` (Temas de su interés: "Economía", "Salud", "Educación")
Campo 5: \`score_rating\` (Grado de acuerdo con la medida de digitalización: escala del 1 al 5 con extremos "Muy negativo" y "Muy positivo")
Campo 6: \`yes_no\` (¿Asistiría a la asamblea comunitaria?)
Campo 7: \`long_text\` (¿Qué sugeriría para mejorar la implementación?)
Campo 8: \`email\` (Correo electrónico de contacto)
Campo 9: \`number\` (Edad)
Campo 10: \`date\` (Fecha de la opinión)`;

console.time("TOTAL");
try {
  const form = await generateForm(prompt, "es");
  console.log("OK ->", JSON.stringify({
    title: form.title,
    description: form.description,
    n: form.questions?.length,
    questions: form.questions?.map((q) => `${q.type}: ${q.label}${q.required ? " *" : ""}`),
    scale: form.questions?.[4]?.scale,
    aiNotes: form.aiNotes,
  }, null, 2));
} catch (e) {
  console.log("ERROR ->", e.name, "|", e.message, "| status:", e.status);
}
console.timeEnd("TOTAL");
