import { createHash } from "crypto";

/* Caché en memoria de formularios generados por IA.

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

const ttlMs = parseInt(process.env.AI_CACHE_TTL_MS) || 600_000;
const maxEntries = parseInt(process.env.AI_CACHE_MAX_ENTRIES) || 500;

const cache = new Map(); // key -> { expiresAt, form }

function clave(prompt) {
  const normalizado = String(prompt || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  return createHash("sha256").update(normalizado).digest("hex");
}

function limpiarCaducados() {
  const ahora = Date.now();
  for (const [k, v] of cache) {
    if (v.expiresAt < ahora) cache.delete(k);
  }
  if (cache.size > maxEntries) {
    /* Elimina los más antiguos sin orden LRU sofisticado: basta con que no
       crezca sin límite en procesos largos. */
    let borrados = 0;
    for (const [k] of cache) {
      cache.delete(k);
      if (++borrados >= cache.size - maxEntries) break;
    }
  }
}

export function obtenerDeCache(prompt) {
  const key = clave(prompt);
  const entrada = cache.get(key);
  if (!entrada) return null;
  if (Date.now() > entrada.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entrada.form;
}

export function guardarEnCache(prompt, form) {
  const key = clave(prompt);
  cache.set(key, { expiresAt: Date.now() + ttlMs, form });
  limpiarCaducados();
  return form;
}

export function vaciarCache() {
  cache.clear();
}

export const aiCache = { obtener: obtenerDeCache, guardar: guardarEnCache, vaciar: vaciarCache };
