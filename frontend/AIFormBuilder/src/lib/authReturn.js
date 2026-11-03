/**
 * ¿A dónde vuelve la persona después de identificarse?
 *
 * El problema que resuelve: entrar es un viaje que se va de la aplicación. Se
 * salta al IDP, el IDP devuelve al backend, el backend devuelve aquí con el
 * token, y todo eso es navegación de página completa. El estado de react-router
 * (y con él cualquier `<Navigate state={{ from }}>`) no sobrevive a eso: al
 * volver, `/login` solo sabía que tenía que llevar "a casa".
 *
 * Con la portada y los formularios detrás del IDP eso ya no vale. Quien abre
 * un enlace para responder a un formulario y no tiene sesión recibe igualmente
 * un "¿quién eres?"; si al volver cae en el panel, ha perdido el formulario
 * que estaba rellenando y tiene que buscar el enlace otra vez.
 *
 * Por eso el destino se guarda en `sessionStorage` y no en el estado del
 * router: la navegación de página completa dentro de la misma pestaña sí lo
 * sobrevive, y al cerrarla se borra solo (que es lo que se quiere: un destino
 * de hace tres días no es de nadie).
 */

const CLAVE = "formly_volver_a";

/**
 * Solo se aceptan rutas internas de esta aplicación.
 *
 * No es desconfianza del propio código: el valor sale de `sessionStorage`, que
 * es del navegador y por tanto del usuario. `//otro-sitio.com` es una URL
 * relativa al protocolo, así que aceptarla sería entregarle al navegador una
 * redirección fuera del dominio. Y `/login` y `/auth/callback` son las propias
 * puertas del IDP: volver ahí cerraría un bucle de recargas.
 */
function esDestinoSeguro(destino) {
  if (typeof destino !== "string" || destino === "") return false;
  if (!destino.startsWith("/")) return false;
  if (destino.startsWith("//")) return false;
  if (destino.startsWith("/login") || destino.startsWith("/auth/")) return false;
  return true;
}

/** Apunta a adónde intends volver (incluye la búsqueda, para no perder filtros). */
export function recordarDestino(destino) {
  if (typeof sessionStorage === "undefined" || !esDestinoSeguro(destino)) return;
  try {
    sessionStorage.setItem(CLAVE, destino);
  } catch {
    // Modo privado o cuota llena: sin destino guardado, que es el mismo
    // resultado que antes de este módulo. No interrumpe el arranque.
  }
}

/**
 * Lee el destino y lo borra en el mismo paso.
 *
 * Se consume, no se lee: si el login falla y se vuelve a intentar, el destino
 * viejo ya no debe resucitar. El que reintenta es `ProtectedRoute`, que lo
 * vuelve a guardar en cada intento.
 */
export function tomarDestino() {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const destino = sessionStorage.getItem(CLAVE);
    sessionStorage.removeItem(CLAVE);
    return esDestinoSeguro(destino) ? destino : null;
  } catch {
    return null;
  }
}
