import { readFileSync } from "node:fs";
import { parsearFormularioPegado, esPeticionCorta } from "../services/ai.service.js";

const t = readFileSync(new URL("./_probe-user.mjs", import.meta.url), "utf8");
const prompt = t.slice(t.indexOf("const prompt = `") + 16, t.lastIndexOf("`"));

console.log("len:", prompt.length, "esPeticionCorta:", esPeticionCorta(prompt));
const primero = prompt.indexOf("{");
const ultimo = prompt.lastIndexOf("}");
try {
  const d = JSON.parse(prompt.slice(primero, ultimo + 1));
  console.log("parse ok, preguntas:", d.questions?.length);
} catch (e) {
  console.log("parse FALLA:", e.message);
}
console.log("pegado ->", parsearFormularioPegado(prompt)?.questions?.length ?? null);
