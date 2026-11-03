/**
 * Perfil público del proveedor de identidad (IDP).
 *
 * Del IDP la aplicación SOLO consume datos públicos del perfil/cuenta del
 * usuario: usuario, nombre completo, imagen de perfil, carné de identidad,
 * correo y fecha de nacimiento. Cualquier otro claim del id_token (sub, iss,
 * aud, jti, sid, session_state, tiempos, locale, zoneinfo, sexo, color de piel,
 * registro, etc.) se descarta y NO se persiste ni se devuelve al frontend.
 */
export function sanitizeIdpProfile(claims) {
  if (!claims || typeof claims !== "object") return null;

  const out = {};
  if (typeof claims.preferred_username === "string" && claims.preferred_username) {
    out.preferred_username = claims.preferred_username;
  }
  if (typeof claims.name === "string" && claims.name) {
    out.name = claims.name;
  }
  // Partes del nombre como respaldo para componer el nombre completo.
  if (typeof claims.given_name === "string" && claims.given_name) {
    out.given_name = claims.given_name;
  }
  if (typeof claims.family_name === "string" && claims.family_name) {
    out.family_name = claims.family_name;
  }
  if (typeof claims.email === "string" && claims.email) {
    out.email = claims.email;
  }
  if (typeof claims.picture === "string" && claims.picture) {
    out.picture = claims.picture;
  }

  // Datos de certificación de identidad: solo los públicos solicitados.
  const cert = claims.certification;
  if (cert && typeof cert === "object") {
    const c = {};
    if (typeof cert.ci === "string" && cert.ci) c.ci = cert.ci;
    if (typeof cert.birthDate === "string" && cert.birthDate) c.birthDate = cert.birthDate;
    if (Object.keys(c).length > 0) out.certification = c;
  }

  return Object.keys(out).length > 0 ? out : null;
}