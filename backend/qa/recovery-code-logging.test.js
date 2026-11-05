import assert from "node:assert/strict";
import test from "node:test";
import { recoveryCodeLogMessage, recoveryResponseData } from "../utils/recoveryPolicy.js";
import { activationUrlFor } from "../services/welcome.service.js";

test("recovery codes are never written to logs in production", () => {
  assert.equal(
    recoveryCodeLogMessage({ nodeEnv: "production", email: "person@example.com", code: "123456" }),
    null,
  );
});

test("development can log the recovery code for local testing", () => {
  const message = recoveryCodeLogMessage({
    nodeEnv: "development",
    email: "person@example.com",
    code: "123456",
  });
  assert.match(message, /person@example\.com/);
  assert.match(message, /123456/);
});

test("recovery response omits code in production and preserves development data", () => {
  assert.deepEqual(recoveryResponseData({ nodeEnv: "production", code: "123456", mailed: false }), {});
  assert.deepEqual(recoveryResponseData({ nodeEnv: "development", code: "123456", mailed: false }), {
    code: "123456",
    mailed: false,
  });
});

test("activation links use the canonical frontend base URL", () => {
  assert.equal(
    activationUrlFor("https://gestion-formularios.onrender.com", "test-token"),
    "https://gestion-formularios.onrender.com/activar?token=test-token",
  );
});
