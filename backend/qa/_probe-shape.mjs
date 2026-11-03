// Sonda 6: que forma devuelve generateJson cuando se le pide un array.
import { generateJson } from "../services/remote.service.js";

const schemaHint = `[{ "num": string, "type": one of [short_text, yes_no, score_rating], "description": string, "required": boolean, "placeholder": string, "options": string[], "scale": { "min": number, "max": number, "minLabel": string, "maxLabel": string }, "dependsOn": string }]`;

const d = await generateJson(
  `For each of these 3 survey questions, say what type it is.
1 ¿Cuál es su nombre?
2 ¿Ha usado el servicio?
3 ¿Qué tan satisfecho está?`,
  { schemaHint },
);
console.log("tipo raiz:", Array.isArray(d) ? "array" : typeof d);
console.log("claves:", Array.isArray(d) ? d.length : Object.keys(d || {}));
console.log(JSON.stringify(d).slice(0, 900));
