import assert from "node:assert/strict";
import test from "node:test";
import * as fieldTypes from "../src/lib/fieldTypes.js";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";

const source = {
  id: "choice",
  type: "radio",
  options: [
    { id: "yes-option", label: "Sí", value: "" },
    { id: "no-option", label: "No", value: "" },
  ],
};

const dependent = {
  id: "details",
  type: "long_text",
  label: "Detalles",
  visibleIf: { questionId: "choice", operator: "equals", value: "Sí" },
};

test("radio choices without explicit values use their labels for conditional answers", () => {
  assert.equal(fieldTypes.optionAnswerValue?.(source.options[0]), "Sí");
  assert.equal(fieldTypes.optionAnswerValue?.(source.options[1]), "No");
});

test("an explicit option value takes precedence over its label", () => {
  assert.equal(fieldTypes.optionAnswerValue?.({ label: "Sí", value: "affirmative" }), "affirmative");
});

test("a dependent field appears for Sí and stays hidden for No", () => {
  const questions = [source, dependent];
  const yes = fieldTypes.optionAnswerValue?.(source.options[0]) ?? "";
  const no = fieldTypes.optionAnswerValue?.(source.options[1]) ?? "";

  assert.deepEqual(fieldTypes.visibleRenderList(questions, {}), [source]);
  assert.deepEqual(fieldTypes.visibleRenderList(questions, { choice: yes }), [source, dependent]);
  assert.deepEqual(fieldTypes.visibleRenderList(questions, { choice: no }), [source]);
});

test("builder preview starts with conditional fields hidden", async () => {
  const vite = await createServer({
    root: fileURLToPath(new URL("..", import.meta.url)),
    configFile: fileURLToPath(new URL("../vite.config.js", import.meta.url)),
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
    logLevel: "error",
  });

  try {
    const [{ FormView }, { LanguageContext }] = await Promise.all([
      vite.ssrLoadModule("/src/components/public/FormView.jsx"),
      vite.ssrLoadModule("/src/contexts/LanguageContext.jsx"),
    ]);
    const form = {
      slug: "conditional-probe",
      title: "Conditional probe",
      theme: "minimal",
      settings: {},
      questions: [source, dependent],
    };
    const tree = React.createElement(
      LanguageContext.Provider,
      { value: { language: "es", t: (key) => key } },
      React.createElement(FormView, { form, preview: true }),
    );
    const html = renderToStaticMarkup(tree);

    assert.equal(html.includes("Detalles"), false);
  } finally {
    await vite.close();
  }
});
