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

test("untitled form fallback follows the locale in builder SEO and preview", async () => {
  const vite = await createServer({
    root: fileURLToPath(new URL("..", import.meta.url)),
    configFile: fileURLToPath(new URL("../vite.config.js", import.meta.url)),
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
    logLevel: "silent",
  });

  try {
    const [{ SettingsPanel }, { FormView }, { LanguageProvider }] = await Promise.all([
      vite.ssrLoadModule("/src/components/builder/SettingsPanel.jsx"),
      vite.ssrLoadModule("/src/components/public/FormView.jsx"),
      vite.ssrLoadModule("/src/contexts/LanguageContext.jsx"),
    ]);
    const form = {
      _id: "form-title-i18n",
      slug: "form-title-i18n",
      theme: "minimal",
      visibility: "public",
      settings: {
        primaryColor: "#00D2FF",
        logo: "",
        borderRadius: 12,
        submitButtonText: "",
        thankYouMessage: "",
        showProgressBar: false,
        seoTitle: "",
        seoDescription: "",
      },
      questions: [],
    };

    for (const storedTitle of ["Formulario sin título", "Untitled form", ""]) {
      for (const [language, expectedTitle] of [
        ["es", "Formulario sin título"],
        ["en", "Untitled form"],
      ]) {
        const localizedForm = { ...form, title: storedTitle };
        const settingsMarkup = renderInLanguage(
          LanguageProvider,
          SettingsPanel,
          { form: localizedForm, onChange: () => {} },
          language,
        );
        const previewMarkup = renderInLanguage(
          LanguageProvider,
          FormView,
          { form: localizedForm, preview: true },
          language,
        );

        assert.ok(
          settingsMarkup.includes(`placeholder="${expectedTitle}"`),
          `SEO placeholder is correct in ${language}; found ${[...settingsMarkup.matchAll(/placeholder="([^"]*)"/g)].map((match) => match[1]).join(", ")}`,
        );
        assert.ok(previewMarkup.includes(`>${expectedTitle}</h1>`));
      }
    }
  } finally {
    await vite.close();
  }
});

test("custom and explicitly localized form titles are preserved", async () => {
  const vite = await createServer({
    root: fileURLToPath(new URL("..", import.meta.url)),
    configFile: fileURLToPath(new URL("../vite.config.js", import.meta.url)),
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
    logLevel: "silent",
  });

  try {
    const [{ SettingsPanel }, { FormView }, { LanguageProvider }] = await Promise.all([
      vite.ssrLoadModule("/src/components/builder/SettingsPanel.jsx"),
      vite.ssrLoadModule("/src/components/public/FormView.jsx"),
      vite.ssrLoadModule("/src/contexts/LanguageContext.jsx"),
    ]);
    const baseForm = {
      _id: "form-title-i18n",
      slug: "form-title-i18n",
      title: "My custom form",
      theme: "minimal",
      visibility: "public",
      settings: {
        primaryColor: "#00D2FF",
        logo: "",
        borderRadius: 12,
        submitButtonText: "",
        thankYouMessage: "",
        showProgressBar: false,
        seoTitle: "",
        seoDescription: "",
      },
      questions: [],
    };
    const forms = [
      { form: baseForm, expectedTitle: { es: "My custom form", en: "My custom form" } },
      {
        form: {
          ...baseForm,
          title: "Formulario sin título",
          title_i18n: { es: "Formulario especial", en: "Named form" },
        },
        expectedTitle: { es: "Formulario especial", en: "Named form" },
      },
    ];

    for (const { form, expectedTitle } of forms) {
      for (const language of ["es", "en"]) {
        const settingsMarkup = renderInLanguage(
          LanguageProvider,
          SettingsPanel,
          { form, onChange: () => {} },
          language,
        );
        const previewMarkup = renderInLanguage(
          LanguageProvider,
          FormView,
          { form, preview: true },
          language,
        );

        assert.ok(settingsMarkup.includes(`placeholder="${expectedTitle[language]}"`));
        assert.ok(previewMarkup.includes(`>${expectedTitle[language]}</h1>`));
      }
    }
  } finally {
    await vite.close();
  }
});
