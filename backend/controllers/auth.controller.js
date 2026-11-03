import * as client from "openid-client";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { getOidcConfig } from "../config/oidc.js";
import { signToken, generateJti, getTokenExpiryDate } from "../utils/token.js";
import { absoluteExpiryFrom, maxConcurrentForRole, sessionPolicyFor } from "../utils/sessionPolicy.js";
import { sendSuccess } from "../utils/apiResponse.js";
import {
  updateUserProfile,
  deleteUser,
  upsertFromIdentityProvider,
  setIdpProfile,
  setIdpUsernameIfFree,
  findUserEntityContext,
} from "../repositories/user.repo.js";
import * as sessionRepo from "../repositories/session.repo.js";
import { writeAudit } from "../repositories/audit.repo.js";
import { query } from "../config/db.js";
import { env } from "../config/env.js";
import { decodeIdTokenPayload } from "../utils/idtoken.js";
import { sanitizeIdpProfile } from "../utils/idpPublicProfile.js";
import { signRespondentToken } from "../middleware/respondent.js";

// Guarda el code_verifier de PKCE mientras dura el login (para producción
// con varias instancias del backend, usa Redis en vez de un Map en memoria).
const pendingLogins = new Map();

/**
 * Destino post-IDP pedido por el frontend (`?return=`).
 * Solo rutas de respuesta a formularios (`/f/<slug>`): cualquier otra cosa
 * cae al callback del panel. Así un enlace manipulado no redirige fuera.
 */
function parseReturnTo(value) {
  const raw = String(value || "").split("?")[0].split("#")[0];
  if (/^\/f\/[A-Za-z0-9_-]{4,64}$/.test(raw)) return raw;
  return null;
}

/** Nombre completo desde claims OIDC (name, full_name, ... con respaldo). */
export function extractRespondentName(claims = {}) {
  const full =
    claims.name ||
    claims.full_name ||
    claims.nombre_completo ||
    claims.nombreCompleto ||
    [claims.given_name, claims.family_name].filter(Boolean).join(" ").trim() ||
    null;
  if (!full) {
    console.warn("[auth] token IDP sin nombre completo; respaldo:", claims.email || claims.sub);
  }
  return full || claims.email || claims.preferred_username || claims.sub || "Encuestado";
}

function getRequestBaseUrl(req) {
  const host = req.get("host") || "localhost:8000";
  // Fuerza https — tu stack ya es https en ambos lados (Vite + Express con certs)
  return new URL(`https://${host}`);
}

/**
 * URIs canónicas del flujo OIDC. Van SIEMPRE desde el entorno
 * (`OIDC_REDIRECT_URI`, `OIDC_LOGIN_REDIRECT_URI`,
 * `OIDC_POST_LOGOUT_REDIRECT_URI`): el Host de la petición no es fiable —
 * el proxy de Vite (`changeOrigin`) lo reescribe a `127.0.0.1:8000` — y el
 * IDP solo acepta las URIs registradas del client, devolviendo 403
 * "Forbidden" a cualquier otra. El cálculo desde el Host queda como
 * fallback para entornos sin esas variables.
 */
function getRequestRedirects(req) {
  const hostHeader = req.get("host") || "localhost:8000";
  const hostname = hostHeader.split(":")[0] || "localhost";
  const frontendUrl = new URL(`https://${hostname}:5173`);
  const requestUrl = new URL(`https://${hostname}:8000`);
  return {
    redirectUri:
      env.oidcRedirectUri || new URL("/api/auth/callback", requestUrl).href,
    loginRedirectUri:
      env.oidcLoginRedirectUri || new URL("/auth/callback", frontendUrl).href,
    postLogoutRedirectUri: env.oidcPostLogoutRedirectUri || frontendUrl.href,
  };
}

export function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return String(forwarded).split(",")[0].trim();
  return req.ip || req.socket?.remoteAddress || "unknown";
}

export function parseDeviceInfo(userAgent = "") {
  const ua = String(userAgent);
  const isMobile = /Android|iPhone|iPad|Mobile/i.test(ua);
  const isTablet = /iPad|Tablet/i.test(ua);
  const device = isTablet ? "Tablet" : isMobile ? "Mobile" : "Desktop";
  const browser = /Edg/i.test(ua)
    ? "Edge"
    : /Chrome/i.test(ua)
      ? "Chrome"
      : /Firefox/i.test(ua)
        ? "Firefox"
        : /Safari/i.test(ua)
          ? "Safari"
          : "Unknown";
  const os = /Windows/i.test(ua)
    ? "Windows"
    : /Mac OS|Macintosh/i.test(ua)
      ? "macOS"
      : /Android/i.test(ua)
        ? "Android"
        : /iPhone|iPad|iOS/i.test(ua)
          ? "iOS"
          : /Linux/i.test(ua)
            ? "Linux"
            : "Unknown";
  return { device, browser, os, raw: ua.slice(0, 300) };
}

async function createSecurityNotification(userId, newDevice, existingCount) {
  try {
    const title = "Nuevo inicio de sesión detectado";
    const desc = `Se detectó acceso desde ${newDevice.browser} en ${newDevice.os} (${newDevice.device}) — IP ${newDevice.ip}. Tienes ${existingCount} sesión(es) activa(s) en diferentes dispositivos. Si no fuiste tú, cierra las sesiones desconocidas.`;
    await query(
      `INSERT INTO notifications (user_id, type, source, title, description)
       VALUES ($1, 'security', 'auth', $2, $3)`,
      [userId, title, desc]
    );
  } catch (e) {
    console.warn("[auth] no se pudo crear notificación de sesión:", e.message);
  }
}

function readCookie(req, name) {
  const cookies = req.headers.cookie?.split(";").map((cookie) => cookie.trim()) || [];
  const value = cookies.find((cookie) => cookie.startsWith(`${name}=`));
  return value ? decodeURIComponent(value.slice(name.length + 1)) : null;
}

function getLogoutRedirectUri(value) {
  const allowedOrigins = [env.frontendUrl, env.clientUrl]
    .flatMap((value) => String(value || "").split(","))
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => new URL(value).origin);
  const fallback = new URL(env.oidcPostLogoutRedirectUri || env.frontendUrl || "http://localhost:5173/");

  try {
    const requested = new URL(value || fallback.href);
    return allowedOrigins.includes(requested.origin) ? requested.href : fallback.href;
  } catch {
    return fallback.href;
  }
}

export const startLogin = asyncHandler(async (req, res) => {
  let config;
  try {
    config = await getOidcConfig();
  } catch (err) {
    console.error("[auth] IDP no disponible:", err?.message);
    // No romper la navegación con un JSON 500: vuelve al frontend con el error
    const redirects = getRequestRedirects(req);
    return res.redirect(`${redirects.loginRedirectUri}?error=idp_unreachable`);
  }
  const redirects = getRequestRedirects(req);

  const codeVerifier = client.randomPKCECodeVerifier();
  const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
  const state = client.randomState();

  // Flujo de encuestado en formulario privado: el retorno viaja en el state.
  const returnTo = parseReturnTo(req.query.return);
  pendingLogins.set(state, { codeVerifier, loginRedirectUri: redirects.loginRedirectUri, returnTo });

  const redirectTo = client.buildAuthorizationUrl(config, {
    redirect_uri: redirects.redirectUri,
    scope: "openid profile email", // ajusta si el CGD indica otros scopes
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
    prompt: "login",
  });

  res.redirect(redirectTo.href);
});

export const handleCallback = asyncHandler(async (req, res) => {
  const config = await getOidcConfig();

  // Base = redirectUri configurada (el Host del proxy no es fiable); de
  // `req.originalUrl` solo se usan sus query params (code, state, iss).
  const currentUrl = new URL(req.originalUrl, getRequestRedirects(req).redirectUri);

  const state = currentUrl.searchParams.get("state");
  const pendingLogin = pendingLogins.get(state);
  pendingLogins.delete(state);

  if (!pendingLogin) {
    return res.redirect(`${env.oidcLoginRedirectUri}?error=state_mismatch`);
  }

  const tokens = await client.authorizationCodeGrant(config, currentUrl, {
    pkceCodeVerifier: pendingLogin.codeVerifier,
    expectedState: state,
  });

  const claims = tokens.claims();

  // ── Encuestado en formulario privado: sin cuenta ni sesión de panel ────
  // El code-exchange ya validó firma y vigencia ante el IDP. Solo se extrae
  // la identidad (sub + nombre) y se sella en un token propio de 6h que la
  // página /f/:slug usará al responder. Nada se persiste en users/sessions.
  if (pendingLogin.returnTo) {
    const slug = pendingLogin.returnTo.split("/")[2];
    const rid = signRespondentToken({
      sub: claims.sub,
      name: claims.name,
      email: claims.email,
      username: claims.preferred_username,
      slug,
    });
    // El destino del encuestado se fija en el entorno, no por el Host del proxy.
    const { loginRedirectUri } = getRequestRedirects(req);
    return res.redirect(`${new URL(loginRedirectUri).origin}${pendingLogin.returnTo}?rid=${rid}`);
  }

  // No persiste TODO el perfil del proveedor: solo los datos públicos
  // (usuario, nombre completo, imagen, carné de identidad, correo y fecha de
  // nacimiento); el resto se descarta por privacidad.
  const user = await upsertFromIdentityProvider({
    externalId: claims.sub,
    name: claims.name || claims.given_name || claims.preferred_username || "Ciudadano",
    email: claims.email || null,
    avatarUrl: claims.picture || claims.avatar || claims.photo || claims.profile_picture || null,
    idpProfile: sanitizeIdpProfile(claims),
  });

  // Adopta el @handle del proveedor si el usuario no tiene uno propio
  if (typeof claims.preferred_username === "string" && claims.preferred_username) {
    await setIdpUsernameIfFree(
      user._id,
      claims.preferred_username.replace(/^@?/, "").toLowerCase(),
    );
  }

  if (tokens.id_token) {
    const secure = env.nodeEnv === "production" ? "; Secure" : "";
    res.setHeader(
      "Set-Cookie",
      `formly_id_token=${encodeURIComponent(tokens.id_token)}; HttpOnly; Path=/api/auth; SameSite=Lax${secure}`,
    );
  }

  // ——— Sesión multi-dispositivo: genera jti y registra dispositivo ———
  const jti = generateJti();
  const appToken = signToken({ id: user._id, jti });
  const expiresAt = getTokenExpiryDate();
  const ip = getClientIp(req);
  const userAgent = req.headers["user-agent"] || "";
  const device = { ...parseDeviceInfo(userAgent), ip };

try {
    await sessionRepo.createSession({
      userId: user._id,
      jti,
      deviceInfo: device,
      ip,
      userAgent,
      expiresAt,
      absoluteExpiresAt: absoluteExpiryFrom(),
    });
    // Respetar el tope de sesiones concurrentes del rol.
    const max = maxConcurrentForRole(user.role);
    const evicted = await sessionRepo.deactivateOldestBeyond(user._id, max);
    if (evicted > 0) {
      await writeAudit({
        actorId: user._id,
        actorRole: user.role,
        action: "session.concurrent_evicted",
        entityType: "user",
        entityId: user._id,
        ip,
        userAgent,
        details: { evicted },
      }).catch(() => {});
    }
    const active = await sessionRepo.listActiveByUser(user._id);
    if (active.length > 1) {
      await createSecurityNotification(user._id, device, active.length);
    }
  } catch (e) {
    console.warn("[auth] no se pudo registrar la sesión:", e.message);
  }

  res.redirect(`${pendingLogin.loginRedirectUri}?token=${appToken}`);
});

export const getMe = asyncHandler(async (req, res) => {
  // ——— Backfill del perfil del proveedor para sesiones ya iniciadas ———
  // Si el usuario aún no tiene idp_profile (login anterior a esta versión) y
  // el navegador conserva el id_token (cookie HttpOnly que ya validamos al
  // iniciar sesión), se usa para mostrar sus datos. El sub debe coincidir.
  if (!req.user.idpProfile) {
    try {
      const idToken = readCookie(req, "formly_id_token");
      const claims = idToken ? decodeIdTokenPayload(idToken) : null;
      if (claims?.sub && claims.sub === req.user.externalId) {
        const publicClaims = sanitizeIdpProfile(claims);
        await setIdpProfile(req.user._id, publicClaims);
        if (typeof claims.preferred_username === "string" && claims.preferred_username) {
          await setIdpUsernameIfFree(
            req.user._id,
            claims.preferred_username.replace(/^@?/, "").toLowerCase(),
          );
        }
        req.user.idpProfile = publicClaims;
      }
    } catch {
      /* backfill opcional: nunca debe romper /me */
    }
  }

  // Contexto de entidad (id/code/name) + slug de la URL de acceso. La
  // identidad mostrada en el frontend es la del realm activo y necesita
  // saber su entidad para el routing por slug y las etiquetas.
  const context = await findUserEntityContext(req.user._id);
  sendSuccess(res, { data: { user: { ...req.user, ...context } } });
});

export const patchProfile = asyncHandler(async (req, res) => {
  const user = await updateUserProfile(req.user._id, req.body);
  sendSuccess(res, { message: "Profile updated", data: { user } });
});

export const deleteAccount = asyncHandler(async (req, res) => {
  await deleteUser(req.user._id);
  sendSuccess(res, { message: "Account deleted" });
});

export const logout = asyncHandler(async (req, res) => {
  const postLogoutRedirectUri = getLogoutRedirectUri(
    req.query.post_logout_redirect_uri || req.query.postLogoutRedirectUri,
  );
  const idTokenHint = readCookie(req, "formly_id_token");
  const secure = env.nodeEnv === "production" ? "; Secure" : "";
  const clearCookie = `formly_id_token=; HttpOnly; Path=/api/auth; Max-Age=0; SameSite=Lax${secure}`;

  // Intenta desactivar la sesión actual si viene con Bearer (flujo SPA)
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (token) {
      const { verifyToken } = await import("../utils/token.js");
      const decoded = verifyToken(token);
      if (decoded?.jti) {
        const { deactivateByJti } = await import("../repositories/session.repo.js");
        await deactivateByJti(decoded.jti);
      }
    }
  } catch {}

  try {
    const config = await getOidcConfig();
    const parameters = { post_logout_redirect_uri: postLogoutRedirectUri };
    if (idTokenHint) parameters.id_token_hint = idTokenHint;
    const endSessionUrl = client.buildEndSessionUrl(config, {
      ...parameters,
    });
    res.setHeader("Set-Cookie", clearCookie);
    return res.redirect(endSessionUrl.href);
  } catch (err) {
    console.warn("[auth] logout fallback — OIDC no disponible:", err?.message);
    res.setHeader("Set-Cookie", clearCookie);
    return res.redirect(postLogoutRedirectUri);
  }
});

// ——— Multi-dispositivo: listado y revocación ———
export const listSessions = asyncHandler(async (req, res) => {
  const sessions = await sessionRepo.listActiveByUser(req.user._id);
  const currentJti = req.token?.jti;
  const data = sessions.map((s) => ({
    id: s.id,
    device: s.device_info?.device || "Unknown",
    browser: s.device_info?.browser || "Unknown",
    os: s.device_info?.os || "Unknown",
    ip: s.ip,
    userAgent: s.user_agent,
    createdAt: s.created_at,
    lastActive: s.last_active,
    lastUserActivity: s.last_user_activity,
    absoluteExpiresAt: s.absolute_expires_at,
    isCurrent: s.jti === currentJti,
  }));
  sendSuccess(res, { data: { sessions: data, count: data.length } });
});

export const revokeSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const session = await sessionRepo.findByIdAndUser(id, req.user._id);
  if (!session) throw new Error("Sesión no encontrada");
  await sessionRepo.deactivateById(id, req.user._id);
  sendSuccess(res, { message: "Sesión cerrada" });
});

export const revokeOtherSessions = asyncHandler(async (req, res) => {
  const currentJti = req.token?.jti;
  if (!currentJti) throw new Error("Sesión actual no identificable");
  await sessionRepo.deactivateAllExcept(req.user._id, currentJti);
  sendSuccess(res, { message: "Otras sesiones cerradas" });
});

export const logoutCurrentSession = asyncHandler(async (req, res) => {
  const currentJti = req.token?.jti;
  if (currentJti) await sessionRepo.deactivateByJti(currentJti);
  sendSuccess(res, { message: "Sesión cerrada" });
});

// ── Política de sesiones (idle + vida absoluta) ─────────────────────────────

/** Estado de la sesión actual: qué caduca cuándo y la política del rol. */
export const getCurrentSession = asyncHandler(async (req, res) => {
  const session = req.session || (req.token?.jti ? await sessionRepo.findByJti(req.token.jti) : null);
  const policy = sessionPolicyFor(req.user?.role);
  const now = Date.now();
  const data = {
    policy: {
      idleMs: policy.idleMs,
      absoluteMs: policy.absoluteMs,
      maxConcurrent: policy.maxConcurrent,
    },
    session: session
      ? {
          jti: session.jti,
          lastUserActivity: session.last_user_activity,
          lastActive: session.last_active,
          absoluteExpiresAt: session.absolute_expires_at,
          createdAt: session.created_at,
          expiresAt: session.expires_at,
          idleRemainingMs: Math.max(0, policy.idleMs - (now - new Date(session.last_user_activity || session.last_active).getTime())),
          absoluteRemainingMs: Math.max(0, new Date(session.absolute_expires_at).getTime() - now),
        }
      : null,
  };
  sendSuccess(res, { data });
});

/** Heartbeat del frontend: marca la última INTERACCIÓN del usuario. */
export const recordActivity = asyncHandler(async (req, res) => {
  if (req.token?.jti) {
    await sessionRepo.touchUserActivity(req.token.jti);
  }
  sendSuccess(res, { message: "ok" });
});
