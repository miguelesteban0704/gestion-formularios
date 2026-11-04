import axios from "axios";
import { recordarDestino } from "./authReturn.js";

/* ——— Sesiones POR ROL (realm), no una sola ranura ———
 *
 * Antes todo cabía en una clave (`TOKEN_KEY`): entrar como administrador de
 * entidad pisaba el token del super_admin, y cerrar sesión —o un 401— borraba
 * el de todos. Ahora cada rol guarda su token en su propia ranura
 * (`formly_session_<realm>`) y `formly_active_realm` decide cuál se envía en las
 * peticiones. Cerrar sesión solo elimina esa ranura; las demás siguen vivas y se
 * reactivan.
 *
 * El orden de recencia (`formly_session_order`, del más antiguo al más reciente)
 * es lo que permite, al cerrar una sesión, devolver el turno a la más reciente
 * que quede: si el super_admin estaba dentro, vuelve él. */

/** Ranura única de versiones anteriores; solo se lee para migrar. */
export const TOKEN_KEY = "formly_token";
const SESSION_PREFIX = "formly_session_";
const ACTIVE_REALM_KEY = "formly_active_realm";
const ORDER_KEY = "formly_session_order";

/** Reinos de sesión: uno por rol de panel + invitado + cuenta IDP. */
export const REALMS = {
  SUPER: "super_admin",
  ENTITY: "entity_admin",
  CREATOR: "form_creator",
  GUEST: "guest",
  ACCOUNT: "account",
  /* Ranura temporal mientras /me revela el rol de un token recién llegado. */
  PENDING: "__pending__",
};

function readOrder() {
  try {
    const raw = JSON.parse(localStorage.getItem(ORDER_KEY) || "[]");
    return Array.isArray(raw) ? raw.filter((realm) => typeof realm === "string") : [];
  } catch {
    return [];
  }
}

function writeOrder(list) {
  try {
    localStorage.setItem(ORDER_KEY, JSON.stringify(list));
  } catch {
    /* Cuota llena o modo privado: sin orden persistido, que es recuperable. */
  }
}

/** Token guardado de un realm, o `null`. */
export function getRealmToken(realm) {
  return realm ? localStorage.getItem(SESSION_PREFIX + realm) : null;
}

/** Realm activo (el que se usa en las peticiones), o `null`. */
export function getActiveRealm() {
  return localStorage.getItem(ACTIVE_REALM_KEY);
}

/**
 * Token de la sesión activa (lo usan axios y el SSE). Si no hay realm activo
 * con token, cae a la ranura única legacy: así una sesión anterior a esta
 * versión sobrevive a la primera carga.
 */
export function getToken() {
  const active = getActiveRealm();
  if (active) {
    const token = getRealmToken(active);
    if (token) return token;
  }
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Guarda el token de un realm y lo deja como activo. El realm pasa al final del
 * orden (el más reciente).
 */
export function setRealmToken(realm, token) {
  if (!realm || !token) return;
  localStorage.setItem(SESSION_PREFIX + realm, token);
  localStorage.setItem(ACTIVE_REALM_KEY, realm);
  writeOrder([...readOrder().filter((r) => r !== realm), realm]);
  // Migración: la ranura única ya no se usa.
  localStorage.removeItem(TOKEN_KEY);
}

/** Marca un realm ya guardado como activo, sin tocar su token ni el orden. */
export function setActiveRealm(realm) {
  if (realm) localStorage.setItem(ACTIVE_REALM_KEY, realm);
}

/** Realms con token guardado, del más antiguo al más reciente. */
export function listRealms() {
  return readOrder().filter((realm) => !!getRealmToken(realm));
}

/**
 * Elimina la sesión de un realm. Si era el activo, promociona al más reciente
 * de los que queden. Devuelve el realm que queda activo, o `null` si no queda
 * ninguno.
 */
export function dropRealm(realm) {
  if (!realm) return getActiveRealm();
  localStorage.removeItem(SESSION_PREFIX + realm);
  writeOrder(readOrder().filter((r) => r !== realm));
  if (getActiveRealm() !== realm) return getActiveRealm();
  const remaining = listRealms();
  const next = remaining.length ? remaining[remaining.length - 1] : null;
  if (next) localStorage.setItem(ACTIVE_REALM_KEY, next);
  else localStorage.removeItem(ACTIVE_REALM_KEY);
  return next;
}

/** Compat: guarda el token en la ranura única legacy (ya no se usa al entrar). */
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);

/**
 * Borra la sesión activa (o la ranura legacy si no hay realm). Devuelve el realm
 * que queda activo, o `null` si no queda ninguno.
 */
export function clearToken() {
  const active = getActiveRealm();
  if (active) return dropRealm(active);
  localStorage.removeItem(TOKEN_KEY);
  return null;
}

const ENV_API_URL = import.meta.env.VITE_API_URL || "/api";

function resolveApiBase() {
  if (typeof window === "undefined") return ENV_API_URL;
  try {
    /* La base relativa usa el origen actual; la absoluta conserva el host
       configurado porque frontend y backend pueden desplegarse por separado. */
    if (ENV_API_URL.startsWith("/")) return ENV_API_URL;
    return new URL(ENV_API_URL, window.location.origin).toString().replace(/\/$/, "");
  } catch {
    return ENV_API_URL;
  }
}

const API_BASE = resolveApiBase();

export function getResolvedApiBase() {
  return resolveApiBase();
}

/**
 * Origen del backend para los archivos que este sirve (logos de formulario,
 * avatares). Son rutas con origen absoluto, así que **no** pasan por el proxy de
 * Vite: si la API va por `/api` (un solo origen, un solo certificado), estos
 * archivos tienen que salir hacia el backend real.
 *
 * - Con la API **relativa** (`/api`, el valor por defecto) se devuelve una ruta
 *   **relativa**: el proxy de Vite cubre `/form-logos` y `/avatars` en
 *   desarrollo, y en producción el backend está en el mismo origen. Así el
 *   proyecto no lleva ningún dominio ni IP escrito, y vale en cualquier entorno.
 * - Con la API **absoluta** se usa su origen: es el caso de un despliegue donde
 *   web y API viven en sitios distintos.
 */
function resolveBackendOrigin() {
  if (!ENV_API_URL.startsWith("/")) {
    try {
      return new URL(ENV_API_URL, "http://x").origin;
    } catch {
      return "";
    }
  }
  return "";
}

/**
 * Convierte una ruta de archivo servido por el backend en una URL que el
 * navegador pueda pedir de verdad.
 *
 * El backend guarda el logo como `/form-logos/<id>.<ext>` y lo publica en la
 * RAÍZ del servidor, no bajo `/api`. Con el proxy de Vite (`/api`) esa raíz ya
 * no es el origen de la web, así que se le antepone el origen del backend: si no,
 * el `src` pediría `/form-logos/...` al dev server y saldría roto.
 *
 * Una URL absoluta —un `https://` de CDN, o un `data:`— se devuelve tal cual: el
 * usuario también puede pegar una URL a mano y ese caso no debe tocarse.
 */
export function assetUrl(pathOrUrl) {
  const v = String(pathOrUrl || "").trim();
  if (!v) return "";
  if (/^(https?:|data:|blob:|\/\/)/i.test(v)) return v;
  const origin = resolveBackendOrigin();
  return `${origin}${v.startsWith("/") ? "" : "/"}${v}`;
}

const API_MESSAGES = {
  "Authentication required": ["Autenticación requerida", "Authentication required"],
  "Invalid or expired token": ["La sesión no es válida o ha caducado", "Invalid or expired token"],
  "User no longer exists": ["El usuario ya no existe", "User no longer exists"],
  "Sesión cerrada en otro dispositivo": ["La sessión se cerró en otro dispositivo", "Session was closed on another device"],
  "Sesión cerrada por inactividad": ["La sessión se cerró por inactividad", "Session closed due to inactivity"],
  "Sesión expirada por tiempo máximo": ["La sessión superó el tiempo máximo", "Session exceeded the maximum time"],
  "Cuenta desactivada": ["Cuenta desactivada", "Account is deactivated"],
  "Form not found": ["Formulario no encontrado", "Form not found"],
  "You do not have access to this form": ["No tienes acceso a este formulario", "You do not have access to this form"],
  "This form is not available": ["Este formulario no está disponible", "This form is not available"],
  "Add at least one question before publishing": ["Añade al menos una pregunta antes de publicar", "Add at least one question before publishing"],
  "Response not found": ["Respuesta no encontrada", "Response not found"],
  "Describe the form you want to create": ["Describe el formulario que quieres crear", "Describe the form you want to create"],
  "Field label and type are required": ["La etiqueta y el tipo del campo son obligatorios", "Field label and type are required"],
  "Provide the question to improve": ["Escribe la pregunta que quieres mejorar", "Provide the question to improve"],
  "Add some questions before generating a summary": ["Añade algunas preguntas antes de generar un resumen", "Add some questions before generating a summary"],
  "Validation failed": ["La validación ha fallado", "Validation failed"],
  "API is healthy": ["La API funciona correctamente", "API is healthy"],
  "AI provider timed out": ["El proveedor de IA tardó demasiado en responder", "AI provider timed out"],
};

function translateApiMessage(message) {
  if (!message) return null;
  const language = localStorage.getItem("formly_language") === "es" ? 0 : 1;
  const exact = API_MESSAGES[message];
  if (exact) return exact[language];
  if (/^".+" is required$/.test(message)) return language === 0 ? message.replace(/^"(.+)" is required$/, '"$1" es obligatorio') : message;
  if (/^".+" must be/.test(message) && language === 0) return message.replace(" must be ", " debe ser ");
  if (message.startsWith("AI returned invalid JSON")) return language === 0 ? "La IA devolvió un JSON no válido" : message;
  if (message.startsWith("Route not found")) return language === 0 ? "Ruta no encontrada" : message;
  return message;
}

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers["Accept-Language"] = localStorage.getItem("formly_language") || "en";
  return config;
});

/**
 * ¿Hay un traspaso con el IDP en marcha?
 *
 * Vive fuera de React a propósito: este interceptor es un callback de axios y
 * no puede leer un contexto. `AuthContext.logout()` lo enciende en cuanto
 * decide cerrar sesión.
 *
 * Existe por un motivo concreto: `POST /auth/sessions/logout` puede responder
 * 401 si la sesión ya estaba revocada o el token había caducado, y el
 * interceptor de abajo, ante cualquier 401 con token presente, recarga la
 * página a `/login`. Como el token se borra DESPUÉS de esa llamada, el 401 veía
 * que todavía lo había — así que el logout se encontraba con dos navegaciones
 * compitiendo: la recarga del interceptor y su propio `location.assign` al
 * endpoint de salida. Ganaba la primera, `/login` montaba, y la pantalla de
 * inicio del IDP se abría en lugar de la de cierre.
 *
 * Al estar en marcha el traspaso, este camino se aparta: ya hay un destino
 * elegido y un temporizador contando.
 */
let traspasoEnCurso = false;

export function marcarTraspaso(activo) {
  traspasoEnCurso = activo;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const language = localStorage.getItem("formly_language") === "es";
    const details = error.response?.data?.details;
    const message = translateApiMessage(error.response?.data?.message) ||
      (status
        ? language ? `Error del backend (${status}). Revisa los registros.` : `Backend error (${status}). Check the backend logs.`
        /* Sin respuesta HTTP. Con la API detrás del proxy de Vite lo normal es
           que el backend esté apagado; si está encendido, lo que se está
           bloqueando es el HTTPS (puerto 8000) desde este equipo. */
        : language
          ? "No hay conexión con la API. Comprueba que el backend esté encendido (npm run start en backend) y, si lo está, que este equipo pueda llegar al puerto 8000 por HTTPS."
          : "No connection to the API. Check the backend is running (npm run start in backend) and, if it is, that this device can reach port 8000 over HTTPS.");

    // Un 401 con token presente es una sesión muerta: se cae la ranura activa
    // y se navega a la puerta. Algunas llamadas (la propia puerta de entrada,
    // el sondeo de un token sin probar) se marcan con `__noLogout` para no
    // disparar este cierre con un simple fallo de credenciales.
    if (status === 401 && getToken() && !traspasoEnCurso && !error.config?.__noLogout) {
      /* Solo se cae la sessión ACTIVA (su realm). Si quedan otras —el caso del
         super_admin que sigue dentro mientras la entidad caduca— no se manda al
         IDP: se recarga a la raíz, que reactiva el realm que siga vivo. */
      const nextRealm = clearToken();
      if (!["/login", "/register"].includes(window.location.pathname)) {
        /* Se apunta el destino ANTES de la recarga. Este es el 401 que pilla a
           alguien rellenando un formulario cuando se le caduca la sessión (o
           cuando se cierran otras sesiones): sin esto, al volver del IDP caería
           en el panel y perdería el formulario que tenía abierto. Es el mismo
           motivo por el que `ProtectedRoute` lo guarda, pero este camino NO
           pasa por `ProtectedRoute`: es una recarga directa. */
        recordarDestino(window.location.pathname + window.location.search + window.location.hash);
        window.location.href = nextRealm ? "/" : "/login";
      }
    }

    return Promise.reject({
      ...error,
      message,
      details,
    });
  },
);

export default api;
