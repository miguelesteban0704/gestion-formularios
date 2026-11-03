import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

/**
 * Identidad de encuestado para formularios privados (sin sesión de panel).
 *
 * El token lo emite el backend tras un code-exchange válido contra el IDP
 * (`handleCallback` con retorno a `/f/:slug`): la firma y vigencia del
 * IDP ya quedaron validadas por openid-client, así que este JWT propio
 * solo transporta `sub`, nombre, correo y usuario extraídos a la página de
 * respuesta. No lleva `jti`: no hay fila en user_sessions y `protect` lo
 * ignoraría.
 */

export function signRespondentToken({ sub, name, email, username, slug }) {
  return jwt.sign(
    { type: "respondent", sub, name: name || null, email: email || null, username: username || null, slug },
    env.jwtSecret,
    { expiresIn: "6h" },
  );
}

/** Opcional: si hay token válido lo adjunta, si no deja seguir (decide el servicio). */
export function attachRespondent(req, _res, next) {
  req.respondent = null;
  const header = req.headers["x-idp-respondent"] || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : req.query.rid || null;
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    if (decoded?.type === "respondent" && decoded.sub) {
      req.respondent = {
        sub: String(decoded.sub),
        name: decoded.name || null,
        email: decoded.email || null,
        username: decoded.username || null,
        slug: decoded.slug || null,
      };
    }
  } catch {
    /* token inválido o caducado: el servicio responde 401 con requiresIdp */
  }
  next();
}
