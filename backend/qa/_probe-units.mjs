import { readFileSync } from "node:fs";
import {
  parsearFormularioPegado,
  parsearListaDeCampos,
  esPeticionCorta,
  inferirTipo,
} from "../services/ai.service.js";

let fallos = 0;
const check = (nombre, real, esperado) => {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) fallos++;
  console.log(`${ok ? "ok  " : "FALLO"} ${nombre}: ${JSON.stringify(real)}${ok ? "" : ` (esperado ${JSON.stringify(esperado)})`}`);
};

// 1. La peticion del autor: ejemplo de formato dentro de una orden de generar.
const t = readFileSync(new URL("./_probe-user.mjs", import.meta.url), "utf8");
const prompt = t.slice(t.indexOf("const prompt = `") + 16, t.lastIndexOf("`"));
check("peticion con ejemplo -> no es formulario pegado", parsearFormularioPegado(prompt), null);

// 2. Un formulario pegado de verdad (2+ preguntas, etiquetas reales) sigue entrando sin llamar al modelo.
const pegado = `Toma este formulario:
{"title":"Satisfaccion","description":"d","questions":[
 {"label":"Tu nombre completo","type":"text","required":true},
 {"label":"Como nos conociste","type":"select","options":["Web","Amigos","Anuncio"]},
 {"label":"Recomendarias el servicio","type":"boolean","required":true},
 {"label":"Comentarios","type":"textarea"}]}`;
const leido = parsearFormularioPegado(pegado);
check("pegado real -> titulo", leido?.title, "Satisfaccion");
check("pegado real -> tipos", leido?.questions?.map((q) => q.type), ["short_text", "dropdown", "yes_no", "long_text"]);

// 3. Un objeto vacio en la prosa antes del json no rompe la lectura.
const conLlaves = `Devuelve un objeto vacío {} si no hay nada. Este es el formulario:
{"questions":[{"label":"Edad","type":"number"},{"label":"Ciudad","type":"text"}]}`;
check("llaves en la prosa -> 2 preguntas", parsearFormularioPegado(conLlaves)?.questions?.length, 2);

// 4. esPeticionCorta sigue detectando la peticion.
check("esPeticionCorta", esPeticionCorta(prompt), true);
check("esPeticionCorta (corta real)", esPeticionCorta("Un formulario con 3 preguntas"), true);
check("esPeticionCorta (encuesta grande)", esPeticionCorta("Una encuesta de 23 ejes y 176 preguntas"), false);

// 5. Tipos que pide el autor traducidos al catalogo.
check("inferirTipo escala", inferirTipo("¿En qué medida recomendarías la tienda del 1 al 10?"), "score_rating");
check("inferirTipo si/no", inferirTipo("¿Ha comprado antes en esta tienda?"), "yes_no");

// 5bis. La lista numerada de campos ("Campo 1: `province` (Provincia)") se
//       parsea en cero llamadas: titulo, tipos, opciones y extremos de escala.
const listaPrompt = `Actúa como un generador de formularios para un sitio web.
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
check("esPeticionCorta (lista de 10 campos)", esPeticionCorta(listaPrompt), true);
check("esPeticionCorta (una sola mención en prosa)", esPeticionCorta("Quiero un formulario. Campo 1: `email` (Correo) sobre un tema largo que sigue y sigue hasta pasarse de cuatrocientos caracteres con creces para que el limite de longitud no sea lo que decida aqui sino el numero de lineas de campo presentes en el texto que ahora mismo es una sola y por tanto no deberia activar el atajo"), false);
const leida = parsearListaDeCampos(listaPrompt, "es");
check("lista -> titulo", leida?.title, "Consulta Ciudadana: Opinión sobre las 176 medidas");
check("lista -> descripcion", leida?.description, "Esta encuesta recoge la opinión de la ciudadanía sobre las 176 nuevas medidas.");
check("lista -> 10 bloques", leida?.questions?.length, 10);
check("lista -> tipos", leida?.questions?.map((q) => q.type), [
  "province",
  "municipality",
  "radio",
  "checkbox",
  "score_rating",
  "yes_no",
  "long_text",
  "email",
  "number",
  "date",
]);
check("lista -> opciones radio", leida?.questions?.[2]?.options?.map((o) => o.label), ["Alto", "Medio", "Bajo", "Ninguno"]);
check("lista -> escala con extremos", leida?.questions?.[4]?.scale, { min: 1, max: 5, minLabel: "Muy negativo", maxLabel: "Muy positivo" });
check("lista -> label sin cola de escala", leida?.questions?.[4]?.label, "Grado de acuerdo con la medida de digitalización");
check("lista -> una sola linea no cuenta", parsearListaDeCampos("Campo 1: `email` (Correo de contacto)"), null);

// 6. Los campos del constructor que el modelo devuelve como desplegable generico
//    se convierten al tipo diseñado (mismo catalogo que la paleta).
const { normalizeForm } = await import("../utils/formNormalize.js");
const generado = normalizeForm({
  title: "Demografia",
  questions: [
    { type: "select", label: "¿En qué provincia vives?", options: ["La Habana", "Matanzas"] },
    { type: "dropdown", label: "Municipio de residencia", options: ["Plaza"] },
    { type: "radio", label: "Sexo" },
    { type: "dropdown", label: "Nivel de escolaridad" },
    { type: "dropdown", label: "¿Cómo nos conociste?", options: ["Web", "Amigos"] },
    { type: "text", label: "¿Qué mejorarías del proceso de pago?" },
  ],
});
check("catalogo -> tipos", generado.questions.map((q) => q.type), [
  "province",
  "municipality",
  "gender",
  "education_level",
  "dropdown",
  "short_text",
]);

console.log(fallos ? `\n${fallos} FALLO(S)` : "\nTODO OK");
process.exit(fallos ? 1 : 0);
