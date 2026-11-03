/**
 * Declaración de tipos para `src/lib/api.js`.
 *
 * Mismo patrón que `lib/utils.d.ts`: describe la API pública que YA existe, sin
 * reimplementarla ni migrarla. Gracias a este `.d.ts` hermano, cualquier
 * `.ts`/`.tsx` puede importar de `@/lib/api` con tipos reales (el shim comodín
 * `declare module "*.js"` solo valía `any`).
 *
 * `api` es la instancia de axios con el interceptor que traduce mensajes del
 * backend y recarga a `/login` ante un 401 con token presente.
 */
import type { AxiosInstance } from "axios";

/** Ranura única de versiones anteriores; solo se lee para migrar. */
export declare const TOKEN_KEY: string;

/** Reinos de sesión: uno por rol de panel + invitado + cuenta IDP. */
export declare const REALMS: {
  SUPER: string;
  ENTITY: string;
  CREATOR: string;
  GUEST: string;
  ACCOUNT: string;
  PENDING: string;
};

/** Token Bearer de la sesión activa, o `null` si no hay ninguna. */
export declare function getToken(): string | null;

/**
 * Token guardado de un realm concreto, o `null`. Los tokens viven separados por
 * rol: cerrar una sesión no borra las demás.
 */
export declare function getRealmToken(realm: string): string | null;

/** Realm activo (el que se envía en las peticiones), o `null`. */
export declare function getActiveRealm(): string | null;

/** Guarda el token de un realm y lo deja como activo (el más reciente). */
export declare function setRealmToken(realm: string, token: string): void;

/** Marca un realm ya guardado como activo, sin tocar su token ni el orden. */
export declare function setActiveRealm(realm: string): void;

/** Realms con token guardado, del más antiguo al más reciente. */
export declare function listRealms(): string[];

/**
 * Elimina la sesión de un realm y devuelve el realm que queda activo (el más
 * reciente de los que queden), o `null`.
 */
export declare function dropRealm(realm: string): string | null;

/** Guarda el token en la ranura única legacy (ya no se usa al entrar). */
export declare function setToken(token: string): void;

/**
 * Borra la sesión activa (o la ranura legacy si no hay realm) y devuelve el
 * realm que queda activo, o `null`.
 */
export declare function clearToken(): string | null;

/** Base de la API ya resuelta contra el host y el protocolo actuales. */
export declare function getResolvedApiBase(): string;

/**
 * Convierte una ruta servida por el backend (`/form-logos/…`) en una URL
 * absoluta pedible. Las URLs absolutas (`https:`, `data:`, `blob:`, `//`) se
 * devuelven tal cual.
 */
export declare function assetUrl(pathOrUrl: string): string;

/** Marca que hay un traspaso con el IDP en curso (apaga la recarga por 401). */
export declare function marcarTraspaso(activo: boolean): void;

/** Tipo del cliente axios exportado por defecto. */
export type ApiClient = AxiosInstance;

declare const api: AxiosInstance;
export default api;
