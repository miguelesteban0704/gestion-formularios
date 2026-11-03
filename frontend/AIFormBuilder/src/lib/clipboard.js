/**
 * Copia texto al portapapeles y devuelve si lo consiguió.
 *
 * `navigator.clipboard` falla sin permiso, sin contexto seguro o en
 * navegadores antiguos. Sin este respaldo, el fallo es silencioso: la
 * promesa se rechaza sin que nadie la ataje, la interfaz confirma
 * "copiado" y no se copió nada. Mentir al usuario es peor que fallar.
 *
 * Un único sitio, porque el respaldo lived aquí y en FormCard, y dos
 * copias de un mismo truco se divergen.
 *
 * @param {string} text
 * @returns {Promise<boolean>} si el texto llegó al portapapeles
 */
export async function copyText(text) {
  const value = String(text ?? "");

  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    // Campo oculto fuera de pantalla: seleccionar en un input visible
    // movería el foco y en iOS no copiaría sin selección explícita.
    const tmp = document.createElement("textarea");
    tmp.value = value;
    tmp.setAttribute("readonly", "");
    tmp.style.cssText = "position:fixed;top:0;left:-9999px;opacity:0";
    document.body.appendChild(tmp);
    tmp.select();
    tmp.setSelectionRange(0, value.length);
    try {
      return document.execCommand("copy");
    } catch {
      return false;
    } finally {
      tmp.remove();
    }
  }
}
