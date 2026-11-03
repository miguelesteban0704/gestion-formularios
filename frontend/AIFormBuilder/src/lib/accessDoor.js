import { accessLoginPath } from "./routes.js";

/**
 * Puerta de acceso (`/a/<slug>`) que usó cada rol gestionado para entrar.
 *
 * El administrador de entidad y el creador entran con credenciales LOCALES por
 * su enlace `/a/<slug>` —no por el proveedor de identidad—, así que al cerrar
 * sesión no tiene sentido devolverlos al cierre del IDP (no tienen sesión
 * allí): se les devuelve a su propia puerta. El slug se recuerda por rol porque
 * cada uno tiene la suya y así el retorno es exacto aunque haya varias sesiones.
 *
 * Se guarda en `localStorage` (igual que la sesión) para sobrevivir a la
 * recarga que provoca el propio cierre de sesión.
 */
const DOOR_KEY = "formly_access_door";

function readDoors() {
  if (typeof window === "undefined") return {};
  try {
    const raw = JSON.parse(localStorage.getItem(DOOR_KEY) || "{}");
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

/** Recuerda la puerta `/a/<slug>` de un rol (se llama al entrar). */
export function rememberAccessDoor(role, slug) {
  if (!role || !slug || typeof window === "undefined") return;
  try {
    const doors = readDoors();
    doors[role] = slug;
    localStorage.setItem(DOOR_KEY, JSON.stringify(doors));
  } catch {
    /* Modo privado o cuota llena: sin puerta recordada, el cierre de sesión
       cae al flujo por defecto (salida del proveedor de identidad). */
  }
}

/** Ruta `/a/<slug>` de vuelta para un rol, o `null` si no se recuerda ninguna. */
export function accessDoorFor(role) {
  if (!role) return null;
  const slug = readDoors()[role];
  return slug ? accessLoginPath(slug) : null;
}
