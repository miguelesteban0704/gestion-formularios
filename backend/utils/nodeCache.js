import SimpleNodeCache from "./simple-node-cache.js";

// Cache de alto rendimiento para respuestas de IA con estadísticas integradas
// Para la alta carga del pipeline de IA, necesitamos:
// - Acceso super-rápido en memoria
// - TTL configurable (predeterminado: 10 minutos, suficiente para reintentos)
// - Estadísticas integradas: hits, misses, creación de clave consistente
// - Reintegro automático al eliminar entradas (útil para limitar memoria)
// - Claves normalizadas con hash SHA-256 (igual que aiCache.js original)

const ttlMs = parseInt(process.env.AI_CACHE_TTL_MS) || 10 * 60 * 1000; // 10 minutos por defecto

// SimpleNodeCache usa internamente Map con TTL y limpieza automática
// Ideal para nuestro caso de uso porque elimina automáticamente las entradas expiradas
const cache = new SimpleNodeCache({
  stdTTL: ttlMs / 1000, // en segundos
  useClones: false, // más rápido, las formas son inmutables después de ser almacenadas
  deleteOnExpire: true, // limpieza automática cuando expira (libera memoria)
});

function clave(prompt) {
  // Normalizar prompt igual que en aiCache.js
  const normalizado = String(prompt || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  
  // Usar createHash de Node.js para SHA-256 consistente
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(normalizado).digest("hex");
}

export function obtenerDeCache(prompt) {
  const key = clave(prompt);
  const valor = cache.get(key);
  if (valor === undefined) {
    // Registrar miss (NodeCache hace esto automáticamente)
    return null;
  }
  // Registrar hit (NodeCache hace esto automáticamente)
  return valor;
}

export function guardarEnCache(prompt, form) {
  const key = clave(prompt);
  cache.set(key, form);
  return form;
}

export function obtenerEstadisticas() {
  return {
    keys: cache.keys().length,
    hits: cache.hits(),
    misses: cache.misses(),
    ks: cache.keys(),
    // Podría agregar hitRate si es necesario
  };
}

export function vaciarCache() {
  cache.flushAll();
}

export const aiCache = {
  obtener: obtenerDeCache,
  guardar: guardarEnCache,
  estadisticas: obtenerEstadisticas,
  vaciar: vaciarCache,
};