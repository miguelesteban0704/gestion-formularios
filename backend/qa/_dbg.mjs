import { writeFileSync } from "node:fs";
import { parsearEspecificacion } from "../services/ai.service.js";

const prompt = `## Título del formulario
Encuesta de Satisfacción del Servicio

## Descripción del formulario
Breve encuesta.

### Pregunta 4
- **Nombre:** ¿Qué aspectos del servicio valoras más?
- **Tipo:** Selección múltiple
- **Obligatoria:** Sí
- **Orientación:** Puedes seleccionar más de una opción entre: rapidez en la atención, amabilidad del personal, claridad de la información, facilidad de los trámites y disponibilidad de canales digitales.

### Pregunta 3
- **Nombre:** ¿Cómo calificarías tu satisfacción?
- **Tipo:** Escala lineal del 1 al 5
- **Obligatoria:** Sí
- **Orientación:** donde 1 es "Muy insatisfecho" y 5 es "Muy satisfecho".`;

const form = parsearEspecificacion(prompt, "es");
const salida = {
  titulo: form?.title,
  descripcion: form?.description,
  bloques: (form?.questions || []).map((q) => ({
    label: q.label,
    type: q.type,
    description: q.description,
    options: q.options?.map((o) => o.label),
    scale: q.scale,
  })),
};
writeFileSync("qa/_dbg-out.json", JSON.stringify(salida, null, 2), "utf8");
console.log("OK");