import assert from "node:assert/strict";
import test from "node:test";
import { buildQuestionAnalytics } from "../services/analytics.service.js";

/* El desglose de preguntas debe partir SIEMPRE del total de respuestas de la
   encuesta, la misma cifra que el KPI. `total` cuenta a quienes contestaron y
   `skipped` a quienes no; ambos suman el total. Este contrato es el que
   impide que cada tarjeta invente su propio denominador. */

const formulario = {
  questions: [
    { id: "radio", type: "radio", label: "Elige", options: [{ id: "a", label: "A" }, { id: "b", label: "B" }] },
    { id: "check", type: "checkbox", label: "Marca", options: [{ id: "c", label: "C" }, { id: "d", label: "D" }] },
    { id: "texto", type: "short_text", label: "Escribe" },
    { id: "estrellas", type: "quality_rating", label: "Valora", scale: { min: 1, max: 5 } },
  ],
};

const respuesta = (answers) => ({ answers });

const respuestas = [
  respuesta([
    { questionId: "radio", value: "A" },
    { questionId: "check", value: ["C", "D"] },
    { questionId: "texto", value: "Hola" },
    { questionId: "estrellas", value: 4 },
  ]),
  respuesta([
    { questionId: "radio", value: "B" },
    { questionId: "check", value: ["C"] },
    { questionId: "estrellas", value: 5 },
  ]),
  // Tercera respuesta: solo contesta el texto. Las demás quedan en blanco.
  respuesta([{ questionId: "texto", value: "Adiós" }]),
];

test("cadaPreguntaDeclaraElTotalDeLaEncuesta", () => {
  const analitica = buildQuestionAnalytics(formulario, respuestas);
  for (const q of analitica) {
    assert.equal(q.responses, 3, `${q.id} debe declarar las 3 respuestas de la encuesta`);
    assert.equal(q.total + q.skipped, 3, `${q.id}: contestadas + sin responder = total`);
  }
});

test("preguntaDeValorUnicoSumaContestadasYSinResponderAlTotal", () => {
  const analitica = buildQuestionAnalytics(formulario, respuestas);
  const radio = analitica.find((q) => q.id === "radio");
  const suma = radio.breakdown.reduce((s, b) => s + b.count, 0);
  assert.equal(radio.total, 2);
  assert.equal(radio.skipped, 1);
  assert.equal(suma, 2, "el desglose suma quienes contestaron");
});

test("seleccionMultipleYTextoDeclaranSinResponderSinFalsearElDesglose", () => {
  const analitica = buildQuestionAnalytics(formulario, respuestas);
  const check = analitica.find((q) => q.id === "check");
  const texto = analitica.find((q) => q.id === "texto");

  assert.equal(check.total, 2);
  assert.equal(check.skipped, 1);
  // Una persona marcó dos opciones: el desglose cuenta marcas, no personas.
  assert.equal(check.breakdown.reduce((s, b) => s + b.count, 0), 3);

  assert.equal(texto.total, 2);
  assert.equal(texto.skipped, 1);
  assert.deepEqual([...texto.samples].sort(), ["Adiós", "Hola"]);
});

test("sinRespuestasElTotalEsCeroYNoHayDescuadre", () => {
  const analitica = buildQuestionAnalytics(formulario, []);
  for (const q of analitica) {
    assert.equal(q.responses, 0);
    assert.equal(q.total, 0);
    assert.equal(q.skipped, 0);
  }
});
