import io

P = "services/ai.service.js"
lineas = io.open(P, encoding="utf-8").read().split("\n")

INI, FIN = 511, 557  # leerSeccion + leerOpciones, ya sin uso

nuevo = r'''/**
 * Opciones escritas en una linea: "Rapidez, Amabilidad, Claridad" o
 * "1. Rapidez  2. Amabilidad". Devuelve la lista limpia y sin repetir.
 *
 * Antes esta funcion recorria el bloque entero buscando lineas con viñeta y se
 * comia las suyas propias —las "- **Nombre:**"—, asi que una pregunta de si/no
 * llegaba con cinco opciones, tres de ellas trozos de su enunciado.
 */
function leerListaOpciones(texto) {
  const salida = [];
  for (const trozo of String(texto || "").split(/\s*(?:,|;|\|\/|\bo\b|\by\b)\s*/i)) {
    const t = trozo
      .replace(/^[\s\-*+]+/, "")
      .replace(/^\d+[.)]\s*/, "")
      .replace(/^["'«“]|[»”]$/g, "")
      .trim();
    if (t) salida.push(t);
  }
  return [...new Set(salida)].slice(0, 30);
}'''

salida = lineas[: INI - 1] + nuevo.split("\n") + lineas[FIN:]
io.open(P, "w", encoding="utf-8", newline="\n").write("\n".join(salida))
print("ok. lineas:", len(salida))