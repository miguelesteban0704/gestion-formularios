import { generateForm } from "./services/ai.service.js";

const prompt = "Actúa como investigador senior en estudios de audiencia y diseño de encuestas. Genera un formulario de encuesta en español, listo para aplicar, de exactamente 11 preguntas sobre la página web CubaDebate en Cuba. Contexto: la encuesta está dirigida a personas residentes en Cuba que hayan visitado al menos una vez el sitio web CubaDebate. El objetivo es conocer hábitos de visita, contenidos y secciones preferidas, frecuencia de acceso, dispositivos utilizados, percepción de utilidad y credibilidad, facilidad de navegación, participación de los usuarios, satisfacción general y áreas de mejora. Requisitos obligatorios: Redacta el formulario completo en español claro, neutral y respetuoso, adaptado al contexto cubano. Incluye un título, una introducción breve, instrucciones para responder, una nota de anonimato y confidencialidad, y un agradecimiento final. Incluye exactamente 11 preguntas numeradas. No agregues preguntas adicionales. Combina tipos de preguntas: selección única, selección múltiple, escala Likert de 1 a 5, una pregunta de recomendación tipo NPS de 0 a 10 y 2 preguntas abiertas breves. Asegura que las preguntas sean claras, no sesgadas, no inductivas y que no contengan dobles preguntas. Incluye opciones de respuesta exhaustivas y mutuamente excluyentes. Cuando corresponda, agrega opciones como 'No sabe' o 'No responde'. No solicites datos personales sensibles ni información que permita identificar a la persona. Indica para cada pregunta: número, texto de la pregunta, tipo de pregunta, opciones de respuesta o escala, y si es obligatoria u opcional. El tiempo estimado de respuesta debe ser de 5 a 7 minutos. Formato de salida: Devuelve únicamente el formulario, sin explicaciones adicionales, usando esta estructura: 1. Título de la encuesta 2. Introducción y consentimiento breve 3. Instrucciones 4. Tabla con las 11 preguntas: N.º | Pregunta | Tipo | Opciones/Escala | Obligatoria 5. Cierre y agradecimiento";

const t0 = Date.now();
try {
  const form = await generateForm(prompt, "es");
  console.log("TOTAL:", Date.now() - t0, "ms");
  console.log("Preguntas:", form.questions?.length);
  console.log("Title:", form.title);
  console.log("Questions sample:", form.questions?.slice(0, 2).map(q => ({ label: q.label, type: q.type, required: q.required, options: q.options })));
} catch (e) {
  console.error("ERROR:", e.message);
  console.log("TOTAL:", Date.now() - t0, "ms");
}