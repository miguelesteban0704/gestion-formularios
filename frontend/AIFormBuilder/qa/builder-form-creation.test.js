import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createBuilderFormOnce } from "../src/lib/builderFormCreation.js";

const builder = readFileSync(
  new URL("../src/pages/Builder.jsx", import.meta.url),
  "utf8",
);

test("builder shares an in-flight create request across StrictMode effect replays", () => {
  assert.match(builder, /createBuilderFormOnce\(/);
  assert.match(builder, /formCreateRequestRef/);
  assert.match(builder, /formApi\.create\(/);
  assert.match(builder, /if \(!active\) return;/);
});

test("concurrent builder mounts reuse one create request and later creation is fresh", async () => {
  const requestRef = { current: null };
  let resolveCreate;
  let createCount = 0;
  const createRequest = () => {
    createCount += 1;
    return new Promise((resolve) => {
      resolveCreate = resolve;
    });
  };

  const first = createBuilderFormOnce(requestRef, createRequest);
  const strictModeReplay = createBuilderFormOnce(requestRef, createRequest);
  assert.strictEqual(strictModeReplay, first);
  assert.equal(createCount, 1);

  resolveCreate({ _id: "form-one" });
  assert.deepEqual(await Promise.all([first, strictModeReplay]), [
    { _id: "form-one" },
    { _id: "form-one" },
  ]);
  assert.equal(requestRef.current, null);

  const nextForm = createBuilderFormOnce(
    requestRef,
    () => Promise.resolve({ _id: "form-two" }),
  );
  assert.deepEqual(await nextForm, { _id: "form-two" });
});

test("a failed builder create clears the in-flight request so it can be retried", async () => {
  const requestRef = { current: null };
  const createError = new Error("create failed");
  const failedRequest = createBuilderFormOnce(
    requestRef,
    () => Promise.reject(createError),
  );

  await assert.rejects(failedRequest, createError);
  await Promise.resolve();
  assert.equal(requestRef.current, null);

  const retriedRequest = createBuilderFormOnce(
    requestRef,
    () => Promise.resolve({ _id: "retried-form" }),
  );
  assert.deepEqual(await retriedRequest, { _id: "retried-form" });
});
