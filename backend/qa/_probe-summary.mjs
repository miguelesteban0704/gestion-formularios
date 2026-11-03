// Sonda: el resumen del formulario en español (botón "Analizar").
import { summarizeForm } from "../services/ai.service.js";

const form = {
  title: "Encuesta de satisfacción",
  questions: [
    { type: "short_text", label: "¿Cuál es su nombre completo?", required: true },
    { type: "email", label: "Correo electrónico de contacto", required: true },
    { type: "province", label: "¿En qué provincia reside?" },
    { type: "score_rating", label: "¿Cómo valora la atención recibida?", required: true },
    { type: "long_text", label: "¿Qué mejorarías del servicio?" },
  ],
};

console.time("TOTAL");
try {
  const summary = await summarizeForm(form, "es");
  console.log("OK ->", JSON.stringify(summary, null, 2));
} catch (e) {
  console.log("ERROR ->", e.name, "|", e.message, "| status:", e.status);
}
console.timeEnd("TOTAL");
