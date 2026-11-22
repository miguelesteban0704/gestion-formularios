import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import * as classificationScale from "../src/lib/classificationScale.js";
import {
  getClassificationScaleItems,
  validateClassificationScaleAnswer,
} from "../src/lib/classificationScale.js";
import { validateField } from "../src/lib/validate.js";

const field = {
  id: "priority",
  type: "importancia",
  required: true,
  scale: { min: 1, max: 5, minLabel: "", maxLabel: "" },
  options: [
    { id: "appointments", label: "Servicio de citas" },
    { id: "other", label: "Otros", isOther: true },
  ],
  visibleIf: { sameFieldCondition: "__other__" },
  conditionalOption: {
    id: "conditional",
    label: "Trámite adicional",
    defaultValue: 3,
  },
};

test("getClassificationScaleItems_showsConditionalOnlyWhenOtherSelected", () => {
  const hidden = getClassificationScaleItems(field, {});
  const visible = getClassificationScaleItems(field, { other: 2 });

  assert.equal(hidden.some((item) => item.id === "conditional"), false);
  assert.equal(visible.some((item) => item.id === "conditional"), true);
});

test("getClassificationScaleItems_omitsConditionalRowForRespondentView", () => {
  const items = getClassificationScaleItems(field, { other: 2 }, { includeConditional: false });

  assert.equal(items.some((item) => item.id === "conditional"), false);
});

test("getClassificationScaleItems_prefersRespondentScoreOverDefault", () => {
  const items = getClassificationScaleItems(field, { other: 2, conditional: 4 });

  assert.equal(items.find((item) => item.id === "conditional").value, 4);
});

test("getClassificationScaleItems_clampsDefaultToCurrentScale", () => {
  const items = getClassificationScaleItems(
    {
      ...field,
      scale: { min: 2, max: 4, minLabel: "", maxLabel: "" },
      conditionalOption: { ...field.conditionalOption, defaultValue: 5 },
    },
    { other: 2 },
  );

  assert.equal(items.find((item) => item.id === "conditional").value, 4);
});

test("validateClassificationScaleAnswer_rejectsOutOfRangeScore", () => {
  const message = validateClassificationScaleAnswer(field, { appointments: 6 }, (key) => key);

  assert.equal(message, "classificationScaleOutOfRange");
});

test("getClassificationScaleItems_readsLegacyOtherEntry", () => {
  const items = getClassificationScaleItems(field, {
    other: { priority: "4", otherText: "Atención presencial" },
  });
  const other = items.find((item) => item.id === "other");

  assert.equal(other.value, 4);
  assert.equal(other.otherText, "Atención presencial");
});

test("validateField_importancia_requiresEveryVisibleRow", () => {
  const requiredField = {
    ...field,
    options: [...field.options, { id: "accessibility", label: "Accesibilidad" }],
  };
  const error = validateField(
    requiredField,
    {
      appointments: 3,
      other: { value: 4, otherText: "Atención presencial" },
    },
    (key) => key,
  );

  assert.equal(error, "classificationScaleIncomplete");
});

test("validateField_importancia_allowsRepeatedScores", () => {
  const error = validateField(
    field,
    {
      appointments: 3,
      other: { value: 3, otherText: "Atención presencial" },
      conditional: 3,
    },
    (key) => key,
  );

  assert.equal(error, null);
});

test("validateField_importancia_doesNotRequireUnselectedOther", () => {
  const error = validateField(field, { appointments: 3 }, (key) => key);

  assert.equal(error, null);
});

test("validateField_importancia_rejectsOutOfRangeScores", () => {
  const error = validateField(field, { appointments: 6, other: { value: 4, otherText: "Presencial" } }, (key) => key);

  assert.equal(error, "classificationScaleOutOfRange");
});

test("validateField_importancia_requiresTextForSelectedOther", () => {
  const optionalField = { ...field, required: false };
  const error = validateField(
    optionalField,
    { appointments: 3, other: { value: 4, otherText: " " } },
    (key) => key,
  );

  assert.equal(error, "classificationScaleOtherTextRequired");
});

test("updateClassificationScaleAnswer_doesNotCreateHiddenConditionalAnswer", () => {
  const update = classificationScale.updateClassificationScaleAnswer;
  assert.equal(typeof update, "function");
  if (typeof update !== "function") return;

  assert.deepEqual(update(field, { appointments: 3 }, "other", 4), {
    appointments: 3,
    other: { value: 4, otherText: "" },
  });
});

test("updateClassificationScaleAnswer_preservesRespondentConditionalScore", () => {
  const update = classificationScale.updateClassificationScaleAnswer;
  assert.equal(typeof update, "function");
  if (typeof update !== "function") return;

  assert.deepEqual(
    update(
      field,
      {
        appointments: 3,
        other: { value: 4, otherText: "Atención presencial" },
        conditional: 5,
      },
      "other",
      2,
    ),
    {
      appointments: 3,
      other: { value: 2, otherText: "Atención presencial" },
      conditional: 5,
    },
  );
});

test("updateClassificationScaleAnswer_preservesOtherTextWhenClearingItsScore", () => {
  const updated = classificationScale.updateClassificationScaleAnswer(
    field,
    {
      other: { value: 4, otherText: "Atención presencial" },
      conditional: 5,
    },
    "other",
    null,
  );

  assert.deepEqual(updated, {
    other: { value: null, otherText: "Atención presencial" },
    conditional: 5,
  });
  assert.equal(
    getClassificationScaleItems(field, updated).some((item) => item.id === "conditional"),
    false,
  );
});

test("activateClassificationScaleOther_opensOtherEntryWithoutShowingConditionalRow", () => {
  const activate = classificationScale.activateClassificationScaleOther;
  assert.equal(typeof activate, "function");
  if (typeof activate !== "function") return;

  const answer = activate(field, { appointments: 3 }, "other");

  assert.deepEqual(answer, {
    appointments: 3,
    other: { value: null, otherText: "" },
  });
  assert.equal(
    getClassificationScaleItems(field, answer).some((item) => item.id === "conditional"),
    false,
  );
});

test("validateField_importancia_requiresScoreForActivatedOther", () => {
  const error = validateField(
    { ...field, required: false },
    {
      appointments: 3,
      other: { value: null, otherText: "Other service" },
    },
    (key) => key,
  );

  assert.equal(error, "classificationScaleIncomplete");
});

test("chronoSelect_keepsDropdownWideWhenTriggerIsCompact", async () => {
  const vite = await createServer({
    root: fileURLToPath(new URL("..", import.meta.url)),
    configFile: fileURLToPath(new URL("../vite.config.js", import.meta.url)),
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
    logLevel: "error",
  });

  try {
    const { getDropdownWidth } = await vite.ssrLoadModule("/src/components/ui/chronoSelectUtils.js");

    assert.equal(typeof getDropdownWidth, "function");
    assert.equal(getDropdownWidth(72, 96), 96);
    assert.equal(getDropdownWidth(120, 96), 120);
  } finally {
    await vite.close();
  }
});

test("classificationScale_usesRailForAnyScaleSize", async () => {
  const vite = await createServer({
    root: fileURLToPath(new URL("..", import.meta.url)),
    configFile: fileURLToPath(new URL("../vite.config.js", import.meta.url)),
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
    logLevel: "error",
  });

  try {
    const [{ PremiumImportancia }, { ValidationSettings }] = await Promise.all([
      vite.ssrLoadModule("/src/components/ui/PremiumImportancia.jsx"),
      vite.ssrLoadModule("/src/components/builder/ValidationSettings.jsx"),
    ]);
    const configuredField = {
      ...field,
      scale: { min: 2, max: 4, minLabel: "", maxLabel: "" },
    };
    const tree = React.createElement(PremiumImportancia, {
      field: configuredField,
      value: {
        appointments: 3,
        other: { value: 4, otherText: "Atención presencial" },
        conditional: 2,
      },
      language: "es",
      t: (key) => key,
    });
    const html = renderToStaticMarkup(tree);
    const idleHtml = renderToStaticMarkup(
      React.createElement(PremiumImportancia, {
        field: configuredField,
        value: {},
        language: "es",
        t: (key) => key,
      }),
    );
    const builderPreviewHtml = renderToStaticMarkup(
      React.createElement(ValidationSettings, {
        field,
        setValidation: () => {},
        setRequired: () => {},
        t: (key) => key,
        language: "es",
      }),
    );

    // El riel se usa para cualquier escala: ya no hay desplegable ChronoSelect.
    assert.equal((html.match(/chrono-select-trigger/g) || []).length, 0);
    assert.equal((html.match(/aria-haspopup="listbox"/g) || []).length, 0);
    // Cada fila puntuada renderiza un radiogroup (el riel) con sus nodos.
    assert.equal((html.match(/role="radiogroup"/g) || []).length, 2);
    assert.match(html, /imp-rail/);
    // Escala 2-4 → 3 nodos por riel, y hay 2 filas puntuadas = 6 radios.
    assert.equal((html.match(/role="radio"/g) || []).length, 6);
    assert.doesNotMatch(html, /aria-label="Servicio de citas: 1"/);
    assert.match(html, /Atención presencial/);
    assert.doesNotMatch(html, /Trámite adicional/);
    assert.doesNotMatch(builderPreviewHtml, /Trámite adicional/);
    // Estado vacío: el riel sigue presente (sin ChronoSelect ni placeholder "#").
    assert.match(idleHtml, /imp-rail/);
    assert.equal((idleHtml.match(/chrono-select-trigger/g) || []).length, 0);
    assert.doesNotMatch(idleHtml, /#<\/span>/);
    assert.match(idleHtml, /addOther/);
    assert.doesNotMatch(idleHtml, /aria-pressed=/);
  } finally {
    await vite.close();
  }
});
