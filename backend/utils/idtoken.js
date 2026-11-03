/**
 * Decodifica (sin verificar) el payload de un id_token JWT.
 *
 * Uso ÚNICO para mostrar datos del proveedor de identidad (claims de perfil).
 * El token ya fue verificado por openid-client durante el intercambio del
 * código de autorización; aquí solo se extrae el contenido para mostrarlo.
 * Nunca se usa para autenticar ni autorizar.
 */
export function decodeIdTokenPayload(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = Buffer.from(parts[1], "base64url").toString("utf8");
    const claims = JSON.parse(payload);
    return claims && typeof claims === "object" ? claims : null;
  } catch {
    return null;
  }
}