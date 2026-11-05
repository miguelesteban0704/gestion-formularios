import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { APIMailer } from "@apimailer/sdk";
import * as mailConfiguration from "../utils/mailConfiguration.js";
import {
  createApiMailerPayload,
  createSmtpTransportOptions,
  isMailConfigured,
  safeMailErrorCode,
} from "../utils/mailConfiguration.js";

test("APIMailer payload uses the configured default sender mailbox", () => {
  assert.deepEqual(
    createApiMailerPayload({
      to: "recipient@example.com",
      subject: "Welcome",
      body: "<p>Hello</p>",
      fromMailboxId: "mailbox-123",
    }),
    {
      to: "recipient@example.com",
      subject: "Welcome",
      body: "<p>Hello</p>",
    },
  );
  assert.deepEqual(
    createApiMailerPayload({
      to: "recipient@example.com",
      subject: "Welcome",
      body: "<p>Hello</p>",
    }),
    {
      to: "recipient@example.com",
      subject: "Welcome",
      body: "<p>Hello</p>",
    },
  );
});

test("APIMailer request omits an unverified mailbox ID and uses the account default", async () => {
  let requestBody;
  const mailer = new APIMailer({
    apiKey: "test-key",
    baseUrl: "https://mailer.example.test",
    fetch: async (_url, request) => {
      requestBody = JSON.parse(request.body);
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        headers: { get: () => null },
        text: async () => JSON.stringify({ success: true }),
      };
    },
  });

  await mailer.send(
    createApiMailerPayload({
      to: "recipient@example.com",
      subject: "Welcome",
      body: "<p>Hello</p>",
      fromMailboxId: "mailbox-123",
    }),
  );

  assert.deepEqual(requestBody, {
    to: "recipient@example.com",
    subject: "Welcome",
    body: "<p>Hello</p>",
  });
});

test("APIMailer is the default provider when no mail provider is selected", () => {
  assert.equal(typeof mailConfiguration.resolveMailProvider, "function");
  assert.equal(
    mailConfiguration.resolveMailProvider({
      nodeEnv: "development",
      smtpHost: "smtp.gmail.com",
      smtpUser: "user",
      smtpPass: "pass",
      apiMailerKey: "configured",
    }),
    "apimailer",
  );
  assert.equal(
    mailConfiguration.resolveMailProvider({
      mailProvider: "smtp",
    }),
    "smtp",
  );
  assert.equal(
    mailConfiguration.resolveMailProvider({ mailProvider: "apimailer" }),
    "apimailer",
  );
  assert.equal(
    mailConfiguration.resolveMailProvider({
      nodeEnv: "production",
      smtpHost: "smtp.gmail.com",
      smtpUser: "user",
      smtpPass: "pass",
      apiMailerKey: "configured",
    }),
    "apimailer",
  );
});

test("SMTP sender defaults to the authenticated account and honors an explicit sender", () => {
  assert.equal(
    mailConfiguration.resolveSmtpFromAddress({ smtpUser: "owner@gmail.com" }),
    "owner@gmail.com",
  );
  assert.equal(
    mailConfiguration.resolveSmtpFromAddress({
      smtpUser: "owner@gmail.com",
      mailFrom: "verified-sender@gmail.com",
    }),
    "verified-sender@gmail.com",
  );
});

test("mail availability requires a supported provider and complete SMTP credentials", () => {
  assert.equal(isMailConfigured({ mailProvider: "", nodeEnv: "development" }), false);
  assert.equal(isMailConfigured({ mailProvider: "none", nodeEnv: "development" }), false);
  assert.equal(isMailConfigured({ mailProvider: "unknown", nodeEnv: "development" }), false);
  assert.equal(isMailConfigured({ mailProvider: "ethereal", nodeEnv: "production" }), false);
  assert.equal(
    isMailConfigured({ mailProvider: "smtp", nodeEnv: "production", smtpHost: "smtp.gmail.com", smtpUser: "user" }),
    false,
  );
  assert.equal(
    isMailConfigured({
      mailProvider: "smtp",
      nodeEnv: "production",
      smtpHost: "smtp.gmail.com",
      smtpUser: "user",
      smtpPass: "pass",
    }),
    true,
  );
});

test("SMTP transport selects implicit TLS for port 465 and STARTTLS for port 587", () => {
  const credentials = { smtpHost: "smtp.gmail.com", smtpUser: "user", smtpPass: "pass" };

  assert.deepEqual(createSmtpTransportOptions({ ...credentials, smtpPort: "465" }), {
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    requireTLS: false,
    auth: { user: "user", pass: "pass" },
  });
  assert.deepEqual(createSmtpTransportOptions({ ...credentials, smtpPort: "587" }), {
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    requireTLS: true,
    auth: { user: "user", pass: "pass" },
  });
});

test("explicit SMTP security only applies when consistent with the port", () => {
  const credentials = { smtpHost: "smtp.gmail.com", smtpUser: "user", smtpPass: "pass" };

  assert.equal(
    createSmtpTransportOptions({ ...credentials, smtpPort: 465, mailSecure: false }).secure,
    true,
  );
  assert.equal(
    createSmtpTransportOptions({ ...credentials, smtpPort: 587, mailSecure: true }).secure,
    false,
  );
  assert.equal(
    createSmtpTransportOptions({ ...credentials, smtpPort: 465, mailSecure: true }).secure,
    true,
  );
  assert.equal(
    createSmtpTransportOptions({ ...credentials, smtpPort: 587, mailSecure: false }).secure,
    false,
  );
});

test("mail diagnostics expose only an allowlisted transport code", () => {
  assert.equal(safeMailErrorCode({ code: "EAUTH", message: "private details" }), "EAUTH");
  assert.equal(
    safeMailErrorCode({ code: "PRIVATE", message: "SMTP_PASS=private details" }),
    "MAIL_TRANSPORT_ERROR",
  );
  assert.equal(safeMailErrorCode({ message: "private details" }), "MAIL_TRANSPORT_ERROR");
});

test("Render configures Gmail SMTP and leaves credentials as dashboard secrets", () => {
  const yaml = readFileSync(new URL("../../render.yaml", import.meta.url), "utf8");
  const service = yaml.match(/name: gestion-formularios-backend([\s\S]*?)(?=\n  - type: web|\s*$)/)?.[0];
  assert.ok(service, "backend service block must exist");

  for (const [key, value] of [
    ["MAIL_PROVIDER", "smtp"],
    ["SMTP_HOST", "smtp.gmail.com"],
    ["SMTP_PORT", "465"],
    ["MAIL_SECURE", "true"],
    ["MAIL_SEND_CREDENTIALS", "false"],
    ["FRONTEND_URL", "https://gestion-formularios.onrender.com"],
  ]) {
    const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(service, new RegExp(`- key: ${key}\\s+value: "?${escapedValue}"?`));
  }
  assert.match(service, /- key: SMTP_USER\s+sync: false/);
  assert.match(service, /- key: SMTP_PASS\s+sync: false/);
  assert.doesNotMatch(service, /- key: NODE_TLS_REJECT_UNAUTHORIZED\s+value: ["']?0["']?/);
});
