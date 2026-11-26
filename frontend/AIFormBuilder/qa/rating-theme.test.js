import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";

function renderInLanguage(LanguageProvider, Component, props, language) {
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key) => (key === "formly_language" ? language : null),
    },
  });

  try {
    return renderToStaticMarkup(
      React.createElement(
        LanguageProvider,
        null,
        React.createElement(Component, props),
      ),
    );
  } finally {
    if (previousStorage) {
      Object.defineProperty(globalThis, "localStorage", previousStorage);
    } else {
      delete globalThis.localStorage;
    }
  }
}

test("selected numeric and star ratings retain their semantic selection in dark mode", async () => {
  const vite = await createServer({
    root: fileURLToPath(new URL("..", import.meta.url)),
    configFile: fileURLToPath(new URL("../vite.config.js", import.meta.url)),
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
    logLevel: "silent",
  });

  try {
    const [{ ScoreRating, StarRating }, { LanguageProvider }] = await Promise.all([
      vite.ssrLoadModule("/src/components/ui/Rating.jsx"),
      vite.ssrLoadModule("/src/contexts/LanguageContext.jsx"),
    ]);

    for (const Component of [ScoreRating, StarRating]) {
      for (const [selectedValue, color] of [
        [1, "danger"],
        [3, "warning"],
        [5, "success"],
      ]) {
        const markup = renderInLanguage(
          LanguageProvider,
          Component,
          {
            value: selectedValue,
            onChange: () => {},
            label: "Rating",
          },
          "en",
        );
        const selectedButton = markup.match(
          /<button\b(?=[^>]*aria-checked="true")[^>]*class="([^"]*)"/,
        )?.[1];

        assert.ok(selectedButton, "the current value is exposed as selected");
        assert.ok(selectedButton.includes(`dark:bg-${color}`));
        assert.ok(selectedButton.includes(`dark:border-${color}`));
        assert.ok(selectedButton.includes("dark:text-white"));
        assert.ok(selectedButton.includes(`hover:bg-${color}`));
        assert.ok(selectedButton.includes(`dark:hover:bg-${color}`));
        assert.ok(selectedButton.includes("hover:text-white"));
        assert.ok(selectedButton.includes("dark:hover:text-white"));
        assert.doesNotMatch(selectedButton, /dark:bg-slate-800\/60/);
        assert.doesNotMatch(selectedButton, /dark:border-white\/10/);
        assert.doesNotMatch(selectedButton, /dark:text-(danger|warning|success)\b/);
        assert.doesNotMatch(selectedButton, /dark:hover:bg-(danger|warning|success)\/30/);
        assert.doesNotMatch(selectedButton, /dark:hover:text-(danger|warning|success)\b/);
      }
    }
  } finally {
    await vite.close();
  }
});

test("rating labels and accessible names follow the LanguageContext locale", async () => {
  const vite = await createServer({
    root: fileURLToPath(new URL("..", import.meta.url)),
    configFile: fileURLToPath(new URL("../vite.config.js", import.meta.url)),
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
    logLevel: "silent",
  });

  try {
    const [{ ScoreRating, StarRating }, { LanguageProvider }] = await Promise.all([
      vite.ssrLoadModule("/src/components/ui/Rating.jsx"),
      vite.ssrLoadModule("/src/contexts/LanguageContext.jsx"),
    ]);
    const cases = [
      [ScoreRating, "en", 'aria-label="Number rating"'],
      [ScoreRating, "es", 'aria-label="Valoración Número"'],
      [StarRating, "en", 'aria-label="Quality rating"'],
      [StarRating, "es", 'aria-label="Valoración Calidad"'],
    ];
    const labels = {
      en: ["Terrible", "Bad", "Acceptable", "Good", "Excellent"],
      es: ["Pésimo", "Malo", "Aceptable", "Bueno", "Excelente"],
    };
    const scaleOf = { en: "of", es: "de" };

    for (const [Component, language, groupLabel] of cases) {
      const markup = renderInLanguage(
        LanguageProvider,
        Component,
        { value: 0, onChange: () => {} },
        language,
      );

      assert.ok(markup.includes(groupLabel), `${language} radiogroup label is translated`);
      labels[language].forEach((label, index) => {
        const optionLabel = `aria-label="${index + 1} ${scaleOf[language]} 5: ${label}"`;
        assert.ok(markup.includes(optionLabel), `${language} option ${index + 1} is translated`);
      });
    }
  } finally {
    await vite.close();
  }
});

test("default rating labels in the preview follow the locale without translating custom labels", async () => {
  const vite = await createServer({
    root: fileURLToPath(new URL("..", import.meta.url)),
    configFile: fileURLToPath(new URL("../vite.config.js", import.meta.url)),
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
    logLevel: "silent",
  });

  try {
    const [{ FieldRenderer }, { LanguageProvider }, { FIELD_DEFS }] = await Promise.all([
      vite.ssrLoadModule("/src/components/public/FieldRenderer.jsx"),
      vite.ssrLoadModule("/src/contexts/LanguageContext.jsx"),
      vite.ssrLoadModule("/src/lib/fieldTypes.js"),
    ]);
    const cases = [
      { type: "quality_rating", language: "es", expectedLabel: "Valoración Calidad" },
      { type: "quality_rating", language: "en", expectedLabel: "Quality rating" },
      { type: "score_rating", language: "es", expectedLabel: "Valoración Número" },
      { type: "score_rating", language: "en", expectedLabel: "Number rating" },
      {
        type: "quality_rating",
        language: "es",
        expectedLabel: "Etiqueta personalizada",
        label: "Etiqueta personalizada",
      },
      {
        type: "quality_rating",
        language: "es",
        expectedLabel: "Calidad adaptada",
        labelI18n: { es: "Calidad adaptada", en: "Custom quality" },
      },
      {
        type: "score_rating",
        language: "en",
        expectedLabel: "Custom form label",
        formI18n: { label: { en: "Custom form label" } },
      },
    ];

    for (const { type, language, expectedLabel, label, labelI18n, formI18n } of cases) {
      const fieldId = `rating-${type}`;
      const markup = renderInLanguage(
        LanguageProvider,
        FieldRenderer,
        {
          field: {
            id: fieldId,
            type,
            label: label ?? FIELD_DEFS[type].label,
            label_i18n: labelI18n,
          },
          value: 0,
          onChange: () => {},
          language,
          disabled: true,
          formI18n: formI18n ? { [fieldId]: formI18n } : undefined,
        },
        language,
      );

      assert.ok(
        markup.includes(`>${expectedLabel}</label>`),
        `${type} preview label is correct in ${language}`,
      );
    }
  } finally {
    await vite.close();
  }
});
