import bcrypt from "bcryptjs";
import crypto from "node:crypto";

/** Coste calibrado para login interactivo sin castigar el event-loop. */
const ROUNDS = 12;

export async function hashPassword(plain) {
  if (!plain || String(plain).length < 8) {
    throw new Error("La contraseña debe tener al menos 8 caracteres");
  }
  return bcrypt.hash(String(plain), ROUNDS);
}

export async function verifyPassword(plain, hash) {
  if (!plain || !hash) return false;
  try {
    return await bcrypt.compare(String(plain), hash);
  } catch {
    return false;
  }
}

// Alfabeto sin caracteres ambiguos (0/O, 1/l/I) para contraseñas temporales que
// el usuario teclea a mano desde el correo.
const TEMP_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

/** Contraseña temporal aleatoria (mínimo 8, por defecto 12 caracteres). */
export function generateTempPassword(length = 12) {
  const size = Math.max(8, Number(length) || 12);
  let out = "";
  for (let i = 0; i < size; i += 1) {
    out += TEMP_ALPHABET[crypto.randomInt(TEMP_ALPHABET.length)];
  }
  return out;
}
