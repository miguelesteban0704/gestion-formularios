import * as client from "openid-client";
import { env } from "./env.js";

let config;

export async function getOidcConfig() {
  if (config) return config;

  config = await client.discovery(
    new URL(env.oidcIssuerUrl),
    env.oidcClientId,
    undefined,       // metadata adicional del cliente, no la necesitamos
    client.None(),   // cliente público (sin client_secret)
  );

  return config;
}