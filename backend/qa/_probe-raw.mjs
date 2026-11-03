// Sonda 1: conectividad cruda con el proveedor (texto y json minimos).
import { generateText, generateJson } from "../services/remote.service.js";
import { env } from "../config/env.js";

console.log("model:", env.aiModel, "| baseURL:", env.aiBaseUrl, "| timeout:", env.aiTimeoutMs);

console.time("text");
try {
  const t = await generateText("Responde exactamente: OK", { systemPrompt: "Eres un asistente." });
  console.log("TEXT ->", JSON.stringify(t).slice(0, 200));
} catch (e) {
  console.log("TEXT ERROR ->", e.name, "|", e.message, "| code:", e.code, "| status:", e.status);
}
console.timeEnd("text");

console.time("json");
try {
  const j = await generateJson('Devuelve {"ok": true, "n": 1}', { schemaHint: '{ "ok": boolean, "n": number }' });
  console.log("JSON ->", JSON.stringify(j));
} catch (e) {
  console.log("JSON ERROR ->", e.name, "|", e.message, "| code:", e.code, "| status:", e.status);
}
console.timeEnd("json");
