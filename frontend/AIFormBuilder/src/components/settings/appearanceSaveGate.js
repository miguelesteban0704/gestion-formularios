/**
 * Compuerta de guardado explícito de Apariencia.
 *
 * Mientras la pestaña Apariencia de Ajustes está abierta, los cambios de tema,
 * acento e idioma NO se autoguardan con debounce (PreferencesSync): se guardan
 * SOLO con el botón "Guardar cambios". Al cerrar la pestaña, la compuerta se
 * libera y PreferencesSync vuelve a su autoguardado normal (para cambios desde
 * el toggle del header, el selector de idioma, etc.).
 */
let explicit = false;
const subscribers = new Set();

export function setAppearanceExplicitSave(value) {
  explicit = Boolean(value);
  subscribers.forEach((fn) => fn());
}

export function getAppearanceExplicitSave() {
  return explicit;
}

export function subscribeAppearanceExplicitSave(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}