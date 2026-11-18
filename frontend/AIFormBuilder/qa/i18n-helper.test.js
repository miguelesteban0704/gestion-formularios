import { test } from "node:test";
import { resolveLocalizedText, commonFormDictionary } from "../src/lib/i18n.js";
import assert from "node:assert/strict";
import * as formI18n from "../src/lib/i18n.js";

function setQuestionValue(questionI18n, path, language, text) {
  assert.equal(typeof formI18n.setQuestionI18nValue, "function");
  return formI18n.setQuestionI18nValue(questionI18n, path, language, text);
}

test("resolves {es,en} object to requested language", () => {
  const val = { es: "Nombre", en: "Name" };
  assert.equal(resolveLocalizedText(val, "es"), "Nombre");
  assert.equal(resolveLocalizedText(val, "en"), "Name");
});

test("falls back to defaultLang when target missing", () => {
  const val = { es: "Nombre" };
  assert.equal(resolveLocalizedText(val, "en", "Nombre"), "Nombre");
});

test("returns plain authored strings unchanged", () => {
  assert.equal(resolveLocalizedText("Nombre", "en"), "Nombre");
  assert.equal(resolveLocalizedText("Campo personalizado", "en"), "Campo personalizado");
});

test("does not fall back to the other locale", () => {
  assert.equal(resolveLocalizedText({ es: "Nombre" }, "en", "Nombre"), "Nombre");
  assert.equal(resolveLocalizedText({ en: "Name" }, "es", "Nombre"), "Nombre");
});

test("handles null/undefined gracefully", () => {
  assert.equal(resolveLocalizedText(null, "en", "fallback"), "fallback");
  assert.equal(resolveLocalizedText(undefined, "en", "fallback"), "fallback");
});

test("updates a nested option translation without changing IDs, values, or sibling options", () => {
  const questionI18n = {
    label: { es: "Pregunta", en: "Question" },
    options: {
      choice_a: { label: { es: "Uno", en: "One" }, value: "answer-a" },
      choice_b: { label: { es: "Dos", en: "Two" }, value: "answer-b" },
    },
  };

  const updated = setQuestionValue(
    questionI18n,
    ["options", "choice_a", "label"],
    "en",
    "First choice",
  );

  assert.deepEqual(updated.options.choice_a, {
    label: { es: "Uno", en: "First choice" },
    value: "answer-a",
  });
  assert.deepEqual(updated.options.choice_b, questionI18n.options.choice_b);
  assert.deepEqual(updated.label, questionI18n.label);
  assert.deepEqual(questionI18n.options.choice_a.label, { es: "Uno", en: "One" });
});

test("updates scale and conditional translations through nested paths", () => {
  const questionI18n = {
    scale: { minLabel: { es: "Bajo", en: "Low" }, maxLabel: { es: "Alto" } },
  };

  const withScale = setQuestionValue(questionI18n, ["scale", "minLabel"], "en", "Least");
  const withCondition = setQuestionValue(
    withScale,
    ["visibleIf", "sameFieldPlaceholder"],
    "en",
    "Please specify",
  );

  assert.deepEqual(withCondition.scale, {
    minLabel: { es: "Bajo", en: "Least" },
    maxLabel: { es: "Alto" },
  });
  assert.deepEqual(withCondition.visibleIf.sameFieldPlaceholder, { en: "Please specify" });
  assert.deepEqual(questionI18n.scale.minLabel, { es: "Bajo", en: "Low" });
  assert.equal(questionI18n.visibleIf, undefined);
});