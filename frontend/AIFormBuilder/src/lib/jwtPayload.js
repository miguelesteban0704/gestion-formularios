/**
 * Decodifica el payload de un JWT (segmento base64url) como texto UTF-8.
 *
 * `atob` devuelve una cadena "binaria" (un carácter por byte), así que pasar su
 * salida directo a `JSON.parse` corrompe los caracteres multibyte: «José» (bytes
 * `0xC3 0xA9`) acaba como «JosÃ©». Aquí se reconstruyen los bytes y se decodifica
 * el resultado como UTF-8. También se normaliza base64url (`-`/`_`) porque
 * `atob` solo acepta base64. Devuelve `null` si el token no es decodificable.
 */
export function decodeJwtPayload(token) {
  if (!token || typeof token !== "string") return null;
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}
