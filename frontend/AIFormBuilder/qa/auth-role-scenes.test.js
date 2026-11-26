import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const authCard = readFileSync(
  new URL("../src/components/auth/AuthCard.jsx", import.meta.url),
  "utf8",
);
const authEntityScene = readFileSync(
  new URL("../src/components/auth/AuthEntityScene.jsx", import.meta.url),
  "utf8",
);
const accessLogin = readFileSync(
  new URL("../src/pages/AccessLogin.jsx", import.meta.url),
  "utf8",
);
const roleI18n = readFileSync(
  new URL("../src/lib/roleI18n.js", import.meta.url),
  "utf8",
);

test("role scenes identify both managers and remain present on mobile", () => {
  assert.match(authCard, /<AuthEntityScene/);
  assert.match(authCard, /<AuthCreatorScene/);
  assert.match(authCard, /rt\("entitySceneTitle"\)/);
  assert.match(authCard, /rt\("entitySceneDesc"\)/);
  assert.match(authCard, /rt\("creatorSceneTitle"\)/);
  assert.match(authCard, /rt\("creatorSceneDesc"\)/);
  assert.doesNotMatch(authCard, /auth-scene-panel hidden sm:flex/);
  assert.match(roleI18n, /entitySceneTitle:/);
  assert.match(roleI18n, /creatorSceneTitle:/);
});

test("entity scene previews its managers and forms in a localized command center", () => {
  assert.match(authEntityScene, /auth-entity-command-center/);
  assert.match(authEntityScene, /title: "entityManagersLabel"/);
  assert.match(authEntityScene, /title: "entityFormsLabel"/);
  assert.equal((roleI18n.match(/entityManagersLabel:/g) || []).length, 2);
  assert.equal((roleI18n.match(/entityFormsLabel:/g) || []).length, 2);
});

test("entity connections pulse slowly when idle and stop pulsing for reduced motion", () => {
  assert.match(authEntityScene, /reduceMotion \? 0\.48 : \[0\.42, 0\.54, 0\.42\]/);
  assert.match(authEntityScene, /repeat: !reduceMotion && !active \? Infinity : 0/);
  assert.match(authEntityScene, /duration: reduceMotion \? 0\.12 : active \? 0\.28 : 4\.8/);
});

test("email focus is handled by the card and never references an unbound setter", () => {
  assert.match(authCard, /onFocusCapture=/);
  assert.match(authCard, /onBlurCapture=/);
  const authField = authCard.slice(authCard.indexOf("export function AuthField"));
  assert.doesNotMatch(authField, /setFocused\(/);
});

test("wrong-door errors are retained as an announced alert", () => {
  assert.match(accessLogin, /auth-door-err/);
  assert.match(accessLogin, /role="alert"/);
  assert.match(accessLogin, /aria-live="polite"/);
});
