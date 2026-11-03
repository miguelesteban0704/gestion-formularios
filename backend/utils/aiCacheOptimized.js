import { createHash } from "crypto";
import SimpleNodeCache from "./simple-node-cache.js";

/* Caché en memoria de formularios generados por IA - Versión Optimizada

Clave: SHA-256 del prompt (normalizado a minúsculas y sin espacios sobrantes).
Valor: el formulario ya normalizado, listo para devolver.
TTL: 10 minutos por defecto — suficiente para que el mismo usuario reintente
un prompt idéntico sin volver a pasar por el modelo.

¿Por qué existe? Un prompt largo y explícito (p. ej. "exactamente 11 preguntas
sobre CubaDebate") obliga al modelo a leer y razonar sobre mucho texto: 30-60 s
solo en la llamada, más timeouts y reintentos. Si el autor re-envía el mismo
prompt (o lo reintenta tras un fallo), la respuesta tiene que ser instantánea,
no otro minuto de espera. El caché no sustituye al modelo: solo evita pagar el
mismo coste dos veces por la misma petición. */

const ttlMs = parseInt(process.env.AI_CACHE_TTL_MS) || 600_000; // 10 minutos por defecto

// Usar SimpleNodeCache (fallback implementation matching node-cache API)
// Proporciona hits/misses automáticos, TTL más eficiente y limpieza automática de entradas cuando expiran.
const cache = new SimpleNodeCache({
  stdTTL: ttlMs / 1000, // en segundos
  useClones: false,
  deleteOnExpire: true,
});

function clave(prompt) {
  const normalizado = String(prompt || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  return createHash("sha256").update(normalizado).digest("hex");
}

export function obtenerDeCache(prompt) {
  const key = clave(prompt);
  const valor = cache.get(key);
  if (valor === undefined) {
    return null; // Miss - NodeCache cuenta esto automáticamente
  }
  return valor; // Hit - NodeCache cuenta esto automáticamente
}

export function guardarEnCache(prompt, form) {
  const key = clave(prompt);
  cache.set(key, form);
  return form;
}

export function obtenerEstadisticasCache() {
  return {
    keys: cache.keys().length,
    hits: cache.hits(),
    misses: cache.misses(),
    hitRate: cache.hitRate(),
  };
}

export function vaciarCache() {
  cache.flushAll();
}

export const aiCache = {
  obtener: obtenerDeCache,
  guardar: guardarEnCache,
  estadisticas: obtenerEstadisticasCache,
  vaciar: vaciarCache,
};