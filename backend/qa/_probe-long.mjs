// Sonda 4: generateForm con un prompt LARGO (pipeline completo).
import { generateForm } from "../services/ai.service.js";

const prompt = `Actúa como un diseñador de encuestas senior. Necesito una encuesta completa sobre clima laboral en la empresa, lista para publicar, dirigida a todos los empleados. Que sea anónima y voluntaria.

La encuesta debe medir las siguientes áreas, cada una en su propia sección con varias preguntas:
1. Condiciones materiales del trabajo (horario, carga, herramientas, espacios)
2. Relación con el jefe directo y comunicación interna
3. Motivación, reconocimiento y desarrollo profesional
4. Equipamiento y recursos tecnológicos
5. Capacitación y formación
6. Seguridad e higiene en el trabajo
7. Beneficios sociales y conciliación vida-trabajo
8. Sugerencias y opinión abierta

Incluye una introducción con consentimiento informado al principio, pregunta demográfica de sexo y de rango de edad, y al final un mensaje de agradecimiento. Marca como obligatorias solo las preguntas indispensables. Incluye preguntas de opción única, opción múltiple, escala de acuerdo y algunas abiertas.`;

console.log("longitud:", prompt.length, "caracteres");
console.time("TOTAL");
try {
  const t0 = Date.now();
  const form = await generateForm(prompt, "es");
  console.log(`TOTAL: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  const tipos = {};
  for (const q of form.questions || []) tipos[q.type] = (tipos[q.type] || 0) + 1;
  console.log(JSON.stringify({
    title: form.title,
    description: form.description?.slice(0, 80),
    bloques: form.questions?.length,
    tipos,
    aiNotes: form.aiNotes,
    primeras: (form.questions || []).slice(0, 12).map((q) => `${q.type}: ${(q.label || q.content || "").slice(0, 60)}`),
    ultimas: (form.questions || []).slice(-5).map((q) => `${q.type}: ${(q.label || q.content || "").slice(0, 60)}`),
  }, null, 2));
} catch (e) {
  console.log("ERROR ->", e.name, "|", e.message, "| status:", e.status);
  console.log(e.stack?.split("\n").slice(0, 8).join("\n"));
}
console.timeEnd("TOTAL");
