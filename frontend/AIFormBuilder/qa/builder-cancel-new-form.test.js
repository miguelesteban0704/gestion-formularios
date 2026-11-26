import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isCancelableNewBuilderForm } from "../src/lib/builderCancel.js";

const builder = readFileSync(
  new URL("../src/pages/Builder.jsx", import.meta.url),
  "utf8",
);
const languageContext = readFileSync(
  new URL("../src/contexts/LanguageContext.jsx", import.meta.url),
  "utf8",
);
const languageSwitcher = readFileSync(
  new URL("../src/components/ui/LanguageSwitcher.jsx", import.meta.url),
  "utf8",
);
const localeSync = readFileSync(
  new URL("../src/components/LocaleSync.jsx", import.meta.url),
  "utf8",
);

test("builder cancellation is scoped to the draft created in the current flow", () => {
  assert.match(builder, /isCancelableNewBuilderForm/);
  assert.match(builder, /newlyCreatedFormId:\s*created\._id/);
  assert.match(builder, /formApi\.remove\(form\._id\)/);
  assert.match(builder, /onConfirm=\{confirmCancelNewForm\}/);
  const cancelButtonIndex = builder.indexOf("onClick={() => setCancelNewFormOpen(true)}");
  const previewButtonIndex = builder.indexOf("onClick={() => setPreview(true)}");
  assert.ok(cancelButtonIndex >= 0 && cancelButtonIndex < previewButtonIndex);
});

test("only the matching unpublished form can be cancelled", () => {
  const form = { _id: "new-draft", status: "draft" };
  assert.equal(isCancelableNewBuilderForm(form, "new-draft"), true);
  assert.equal(isCancelableNewBuilderForm(form, "existing-form"), false);
  assert.equal(
    isCancelableNewBuilderForm({ ...form, status: "published" }, "new-draft"),
    false,
  );
  assert.equal(isCancelableNewBuilderForm(null, "new-draft"), false);
});

test("locale route changes preserve the new-form marker", () => {
  assert.match(languageSwitcher, /navigate\(destino,\s*\{\s*replace:\s*true,\s*state\s*\}\)/);
  assert.match(localeSync, /navigate\(destino,\s*\{\s*replace:\s*true,\s*state\s*\}\)/);
});

test("cancel-draft confirmation copy is localized in English and Spanish", () => {
  for (const key of [
    "cancelNewForm",
    "cancelNewFormTitle",
    "cancelNewFormDescription",
    "deleteNewForm",
    "newFormDeleted",
  ]) {
    assert.equal(
      (languageContext.match(new RegExp(`\\b${key}:`, "g")) || []).length,
      2,
      `${key} must have English and Spanish translations`,
    );
  }
});
