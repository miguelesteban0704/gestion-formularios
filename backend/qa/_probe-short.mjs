// Sonda 2: generateForm con un prompt CORTO.
import { generateForm } from "../services/ai.service.js";

const prompt = process.argv[2] || "Un formulario con 3 preguntas: nombre completo, correo electrónico y una escala del 1 al 5 de satisfacción";

console.log("prompt:", prompt);
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
