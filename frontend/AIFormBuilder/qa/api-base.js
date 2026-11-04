import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const productionEnv = fs.readFileSync(path.join(root, ".env.production"), "utf8");
const configuredApiUrl = productionEnv.match(/^VITE_API_URL=(.+)$/m)?.[1];

assert.ok(configuredApiUrl, "production must configure VITE_API_URL");

const previousWindow = globalThis.window;
globalThis.window = {
  location: {
    origin: "https://gestion-formularios.onrender.com",
    hostname: "gestion-formularios.onrender.com",
    protocol: "https:",
  },
};

let vite;
try {
  vite = await createServer({
    root,
    mode: "production",
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true },
  });
  const { getResolvedApiBase } = await vite.ssrLoadModule("/src/lib/api.js");
  assert.equal(getResolvedApiBase(), configuredApiUrl);
  console.log("OK: production API URL stays on its configured backend host");
} finally {
  if (vite) await vite.close();
  if (previousWindow === undefined) delete globalThis.window;
  else globalThis.window = previousWindow;
}
