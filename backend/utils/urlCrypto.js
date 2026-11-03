import crypto from "crypto";
import { env } from "../config/env.js";

/**
 * Contexto cifrado de las URLs de acceso por entidad y rol.
 *
 * El rol y la entidad nunca viajan en texto plano legible: se sellan con
 * AES-256-GCM en un token `ctx` que acompaña al slug aleatorio. El sello
 * incluye el slug, así que un `ctx` no se puede trasplantar a otra URL.
 * La clave sale de URL_SECRET (o deriva de JWT_SECRET de forma documentada).
 */

function getKey() {
  const secret = env.urlSecret || env.jwtSecret;
  if (!secret) {
    throw new Error("Falta URL_SECRET (o JWT_SECRET) para sellar URLs de acceso");
  }
  return crypto.scryptSync(String(secret), "access-url-context", 32);
}

/** Slug aleatorio no predecible: `a7f3k9-login-x2m8` (crypto.randomBytes). */
export function randomAccessSlug() {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const part = (n) => {
    const bytes = crypto.randomBytes(n);
    let out = "";
    for (let i = 0; i < n; i++) out += alphabet[bytes[i] % alphabet.length];
    return out;
  };
  return `${part(6)}-login-${part(4)}`;
}

export function sealAccessContext({ entityId, entityCode, role, slug }) {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const payload = JSON.stringify({ v: 1, e: entityCode || null, eid: entityId || null, r: role, s: slug });
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("base64url"),
    enc.toString("base64url"),
    tag.toString("base64url"),
  ].join(".");
}

/** Devuelve el contexto o null si el sello no es válido. Nunca lanza. */
export function openAccessContext(sealed) {
  try {
    const [ivB64, encB64, tagB64] = String(sealed || "").split(".");
    if (!ivB64 || !encB64 || !tagB64) return null;
    const key = getKey();
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64url"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
    const plain = Buffer.concat([
      decipher.update(Buffer.from(encB64, "base64url")),
      decipher.final(),
    ]).toString("utf8");
    const data = JSON.parse(plain);
    if (!data || data.v !== 1 || !data.r || !data.s) return null;
    return data;
  } catch {
    return null;
  }
}
