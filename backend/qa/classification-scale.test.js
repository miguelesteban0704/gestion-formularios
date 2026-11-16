import assert from "node:assert/strict";
import test from "node:test";
import { normalizeQuestion } from "../utils/formNormalize.js";

test("normalizeQuestion_keepsImportanceTypeAndScale", () => {
  const question = normalizeQuestion(
    {
      type: "importancia",
      label: "Prioridad de los trámites",
      options: [
        { label: "Servicio de citas" },
        { label: "Círculo Infantil" },
        { label: "Certificado de Habitabilidad" },
      ],
      scale: {
        min: 1,
        max: 5,
        minLabel: "Mayor prioridad",
        maxLabel: "Menor prioridad",
      },
    },
    0,
    "es",
  );

  assert.equal(question.type, "importancia");
  assert.deepEqual(question.scale, {
    min: 1,
    max: 5,
    minLabel: "Mayor prioridad",
    maxLabel: "Menor prioridad",
  });
  assert.equal(question.options.length, 3);
  assert.ok(question.options.every((option) => option.id));
});

test("normalizeQuestion_keepsImportanceTypeWhenDescriptionDefinesScale", () => {
  const question = normalizeQuestion(
    {
      type: "importancia",
      label: "Prioridad de los trámites",
      description: "1 = Menor prioridad, 5 = Mayor prioridad",
      options: ["Servicio de citas", "Círculo Infantil"],
    },
    0,
    "es",
  );

  assert.equal(question.type, "importancia");
  assert.deepEqual(question.scale, {
    min: 1,
    max: 5,
    minLabel: "Menor prioridad",
    maxLabel: "Mayor prioridad",
  });
});

test("normalizeQuestion_preservesOtherOption", () => {
  const question = normalizeQuestion(
    {
      type: "importancia",
      label: "Prioridad de los trámites",
      options: [
        { label: "Servicio de citas" },
        { label: "Otro", isOther: true },
      ],
      scale: { min: 1, max: 5 },
    },
    0,
    "es",
  );

  assert.equal(question.options.filter((option) => option.isOther === true).length, 1);
});

test("normalizeQuestion_resolvesClassificationScaleAlias", () => {
  const question = normalizeQuestion(
    {
      type: "Clasificación por Escala",
      label: "Prioridad de los trámites",
      options: ["Servicio de citas", "Otro"],
    },
    0,
    "es",
  );

  assert.equal(question.type, "importancia");
});
