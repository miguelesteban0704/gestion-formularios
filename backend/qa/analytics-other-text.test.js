import assert from "node:assert/strict";
import test from "node:test";
import { buildQuestionAnalytics } from "../services/analytics.service.js";

/* El desglose de «Desglose de preguntas» tiene que enseñar el texto que la
   persona escribió en «Otros» como respuesta efectiva: agrupando los textos
   idénticos, manteniendo separados los distintos y cayendo a la etiqueta
   genérica sólo cuando no hay texto recuperable. Estas sondas son puras (no
   tocan la base de datos): reciben el formulario y las respuestas ya guardadas,
   tal como las devuelve `response.repo`. */

const breakdownDe = (form, responses, id) =>
  buildQuestionAnalytics(form, responses).find((q) => q.id === id);

/* El desglose declara todas las opciones del catálogo (las que no recibió
   nadie quedan en 0 y el gráfico las descarta). Para comparar sólo cuentan las
   respuestas efectivas. */
const comoMapa = (breakdown) =>
  Object.fromEntries(
    breakdown.filter((b) => b.count > 0).map((b) => [b.label, b.count]),
  );

test("radio_OtrosAgrupaTextosIdenticosYSeparaLosDistintos", () => {
  const form = {
    questions: [
      {
        id: "q1",
        type: "radio",
        label: "¿Cómo nos conociste?",
        options: [
          { id: "o1", label: "Redes" },
          { id: "o2", label: "Otros", isOther: true },
        ],
      },
    ],
  };
  const respuestas = (textos) =>
    textos.map((texto) => ({
      answers: [
        texto === null
          ? { questionId: "q1", label: "¿Cómo nos conociste?", type: "radio", value: "Redes" }
          : {
              questionId: "q1",
              label: "¿Cómo nos conociste?",
              type: "radio",
              value: "Otros",
              otherText: texto,
            },
      ],
    }));

  const q = breakdownDe(
    form,
    respuestas([null, "Recomendación", "Recomendación", "Anuncio"]),
    "q1",
  );

  assert.equal(q.total, 4);
  assert.deepEqual(comoMapa(q.breakdown), {
    Redes: 1,
    Recomendación: 2,
    Anuncio: 1,
  });
  // El texto escrito sustituye a la etiqueta genérica como respuesta efectiva.
  assert.equal(
    q.breakdown.filter((b) => b.label === "Otros").every((b) => b.count === 0),
    true,
  );
});

test("radio_OtrosSinTextoConserveLaEtiquetaGenerica", () => {
  const form = {
    questions: [
      {
        id: "q1",
        type: "radio",
        label: "¿Cómo nos conociste?",
        options: [
          { id: "o1", label: "Redes" },
          { id: "o2", label: "Otros", isOther: true },
        ],
      },
    ],
  };
  const respuestas = [
    { answers: [{ questionId: "q1", value: "Otros" }] },
    { answers: [{ questionId: "q1", value: "Otros", otherText: "   " }] },
    { answers: [{ questionId: "q1", value: "Otros", otherText: "Anuncio" }] },
  ];

  const q = breakdownDe(form, respuestas, "q1");

  assert.deepEqual(comoMapa(q.breakdown), { Otros: 2, Anuncio: 1 });
});

test("checkbox_leeElTextoDeOtrosEntreVariasSelecciones", () => {
  const form = {
    questions: [
      {
        id: "q2",
        type: "checkbox",
        label: "¿Qué canales usas?",
        options: [
          { id: "c1", label: "Correo" },
          { id: "c2", label: "Otros", isOther: true },
        ],
      },
    ],
  };
  const respuestas = [
    {
      answers: [
        { questionId: "q2", value: ["Correo", "Otros"], otherText: "WhatsApp" },
      ],
    },
    {
      answers: [
        { questionId: "q2", value: ["Otros"], otherText: "WhatsApp" },
      ],
    },
    { answers: [{ questionId: "q2", value: ["Otros"], otherText: "Telegram" }] },
  ];

  const q = breakdownDe(form, respuestas, "q2");

  assert.deepEqual(comoMapa(q.breakdown), { Correo: 1, WhatsApp: 2, Telegram: 1 });
});

test("importancia_sustituyeElTextoAnidadoDeOtroPorEtiqueta", () => {
  const form = {
    questions: [
      {
        id: "q3",
        type: "importancia",
        label: "Prioridad de los trámites",
        options: [
          { id: "opt_citas", label: "Citas" },
          { id: "opt_otro", label: "Otro", isOther: true },
        ],
        scale: { min: 1, max: 5 },
      },
    ],
  };
  const respuestas = [
    {
      answers: [
        {
          questionId: "q3",
          value: { opt_citas: 5, opt_otro: { value: 4, otherText: "Soporte técnico" } },
        },
      ],
    },
    {
      answers: [
        {
          questionId: "q3",
          value: { opt_citas: 3, opt_otro: { value: 2, otherText: "Soporte técnico" } },
        },
      ],
    },
    { answers: [{ questionId: "q3", value: { opt_citas: 4, opt_otro: 5 } }] },
    {
      answers: [
        {
          questionId: "q3",
          value: { opt_citas: 2, opt_otro: { value: 3, otherText: "Becas" } },
        },
      ],
    },
  ];

  const q = breakdownDe(form, respuestas, "q3");
  const porEtiqueta = Object.fromEntries(
    q.breakdown.map((b) => [b.label, { count: b.count, averageScore: b.averageScore }]),
  );

  assert.equal(q.total, 4);
  assert.deepEqual(porEtiqueta, {
    Citas: { count: 4, averageScore: 3.5 },
    "Soporte técnico": { count: 2, averageScore: 3 },
    Otro: { count: 1, averageScore: 5 },
    Becas: { count: 1, averageScore: 3 },
  });
  // La escala numérica no se colapsa: el desglose sigue siendo por opción.
  assert.equal(q.breakdown.some((b) => b.label === "5"), false);
});

test("respuestasAntiguasSinOtherTextNoRompenElDesglose", () => {
  const form = {
    questions: [
      {
        id: "q4",
        type: "radio",
        label: "¿Cómo nos conociste?",
        options: [
          { id: "o1", label: "Redes" },
          { id: "o2", label: "Otros", isOther: true },
        ],
      },
      {
        id: "q5",
        type: "importancia",
        label: "Prioridad",
        options: [
          { id: "opt_a", label: "Citas" },
          { id: "opt_b", label: "Otro", isOther: true },
        ],
        scale: { min: 1, max: 5 },
      },
    ],
  };
  // Filas guardadas antes del arreglo: `value` a secas, sin `otherText`.
  const respuestas = [
    { answers: [{ questionId: "q4", value: "Otros" }] },
    { answers: [{ questionId: "q5", value: { opt_a: 4, opt_b: 2 } }] },
  ];

  const q4 = breakdownDe(form, respuestas, "q4");
  const q5 = breakdownDe(form, respuestas, "q5");

  assert.deepEqual(comoMapa(q4.breakdown), { Otros: 1 });
  assert.deepEqual(
    q5.breakdown.map((b) => ({ label: b.label, count: b.count })),
    [
      { label: "Citas", count: 1 },
      { label: "Otro", count: 1 },
    ],
  );
});

test("condicionDeOtroExcluyeElMarcadorInternoDeEscala", () => {
  const form = {
    questions: [
      {
        id: "q6",
        type: "radio",
        label: "¿Algo más?",
        options: [
          { id: "o1", label: "Nada" },
          { id: "o2", label: "Otra", isOther: true },
        ],
        // El marcador `__other__` es interno de la clasificación por escala:
        // no es una opción y no debe usarse como disparador.
        visibleIf: { sameFieldCondition: "__other__" },
      },
    ],
  };
  const respuestas = [
    { answers: [{ questionId: "q6", value: "Otra", otherText: "Sugerencia" }] },
  ];

  const q = breakdownDe(form, respuestas, "q6");

  assert.deepEqual(comoMapa(q.breakdown), { Sugerencia: 1 });
  assert.equal(q.breakdown.some((b) => b.label === "__other__"), false);
});