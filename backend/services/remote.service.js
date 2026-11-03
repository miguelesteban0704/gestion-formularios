import OpenAI from "openai";
import { env } from "../config/env.js";

// Cliente único reutilizado para todas las llamadas.
// `maxRetries: 0` a propósito: los reintentos los controla callAI para poder
// respetar el Retry-After del proveedor y no multiplicar esperas (el SDK, por
// defecto, reintenta 2 veces por su cuenta).
const client = new OpenAI({
  apiKey: env.aiApiKey,
  baseURL: env.aiBaseUrl,
  timeout: env.aiTimeoutMs,
  maxRetries: 0,
  httpAgent: undefined, // Evita keep-alive que puede colgar timeouts
});

const MODEL = env.aiModel;

/* Codigos de estado que merece la pena reintentar: limites de ritmo y caidas
   transitorias del gateway. Un 400/401/404 no se arregla esperando. */
const ESTADOS_REINTENTABLES = new Set([408, 409, 429, 500, 502, 503, 504]);

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

function estadoDe(error) {
  return error?.status ?? error?.response?.status ?? null;
}

function esTimeout(error) {
  return error?.name === "APIConnectionTimeoutError" || error?.code === "ETIMEDOUT";
}

/* Segundos que el proveedor pide esperar (`Retry-After`), o null si no lo dice. */
function retryAfterSegundos(error) {
  const cabecera = error?.headers?.["retry-after"] ?? error?.headers?.get?.("retry-after");
  const n = Number(cabecera);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/* Espera antes del siguiente intento: la que pida el proveedor (`Retry-After`)
   o un backoff exponencial. Tope de 8 s: un Retry-After enorme no deja al autor
   mirando una ruleta, y por encima de eso ya no se reintenta (abajo). */
function esperaDe(error, intento) {
  const sugerida = retryAfterSegundos(error);
  const base = sugerida ? sugerida * 1000 : 1000 * 2 ** intento;
  return Math.min(Math.max(base, 500), 8000);
}

/* Cuota agotada. El proveedor lo avisa por el mensaje ("Daily token quota
   exceeded", "Insufficient balance") y el Retry-After que da es de horas o
   directamente absurdo —medido con LLM7: 85567 s, y luego 60, 59, 49… bajando
   sin sentido—. Reintentar eso son minutos de reloj para acabar igual. */
const CUOTA_AGOTADA =
  /daily\s+(?:token\s+)?quota|quota\s+(?:exceeded|exhausted|reached)|insufficient\s+balance|no\s+balance|saldo\s+insuficiente/i;

/* Un Retry-After por encima de esto no es un límite de ritmo pasajero, es una
   puerta cerrada: 60 s son los que llegaba a pedir LLM7 en un 429 de cuota. */
const RETRY_AFTER_RAZONABLE = 10;

/* Un timeout o una conexión caída se reintentan UNA vez: pueden ser
   transitorios, pero encadenar varios intentos de 60 s deja la generación
   colgada minutos sin avisar (medido: 15 min con LLM7 en el peor caso). */
function esReintentable(error, intento) {
  if (esTimeout(error)) return intento < 1;
  if (error?.name === "APIConnectionError") return intento < 1;
  if (CUOTA_AGOTADA.test(error?.message || "")) return false;
  const status = estadoDe(error);
  if (status === 429) {
    const sugerida = retryAfterSegundos(error);
    return !sugerida || sugerida <= RETRY_AFTER_RAZONABLE;
  }
  if (ESTADOS_REINTENTABLES.has(status)) return true;
  return ["ECONNRESET", "ECONNREFUSED", "EAI_AGAIN", "ENOTFOUND"].includes(error?.code);
}

function describirError(error) {
  return esTimeout(error)
    ? `timeout tras ${env.aiTimeoutMs} ms`
    : `HTTP ${estadoDe(error) ?? "?"}: ${error?.message || "error desconocido"}`;
}

/* Los modelos que razonan (minimax y compañía) meten sus divagaciones en
   etiquetas <think>. Fuera del JSON eso no es la respuesta y contamina los
   parsers de texto plano; dentro del JSON puede romper el parseo. Se quitan en
   el borde, una sola vez, para todos los que consumen `generateText`. */
function limpiarRazonamiento(texto) {
  return String(texto ?? "")
    .replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, "")
    .trim();
}

/**
 * Tope de salida. Es el techo del json mas largo que se puede pedir: una
 * encuesta de unas 70 preguntas con sus secciones entra de sobra, y a partir de
 * ahi hay que generar por partes, no dejar que el proveedor corte en silencio.
 */
const AI_MAX_TOKENS = 8192;

/**
 * Llamada base al modelo remoto
 */
async function callAI(messages, { jsonMode = false, maxTokens } = {}) {
  const intentos = env.aiMaxRetries + 1;

  for (let intento = 0; intento < intentos; intento++) {
    /* Reloj por llamada: en un pipeline de 4-6 viajes con paralelismo 1, el
       tiempo del proveedor ES el tiempo total, y sin este log no se distingue
       un proveedor lento de un pipeline que hace demasiados viajes. Va fuera
       del `try` para que el `catch` pueda leerlo. */
    const tLlamada = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), env.aiTimeoutMs);

      const response = await client.chat.completions.create(
        {
          model: MODEL,
          messages,
          /* Para JSON estructurado el sampling alto es el enemigo: es lo que hace
             que un array pedido como "string[]" vuelva como un unico string CSV.
             A 0.7 salio exactamente eso. El texto libre se queda como estaba. */
          temperature: jsonMode ? 0.2 : 0.7,
          response_format: jsonMode ? { type: "json_object" } : undefined,
          /* Sin esto el proveedor decide el tope, y el resultado es que un
             formulario de 15 preguntas cabe y uno de 60 se corta a media
             pregunta. Con el JSON a medias, `JSON.parse` revienta y se pierde el
             formulario entero: no sale una encuesta truncada, sale un error. El
             tope va alto a proposito, porque el prompt pide cubrir todo lo que el
             usuario enumeró y el numero de preguntas sale de ahi, no de un
             maximum fijo. */
          max_tokens: maxTokens ?? AI_MAX_TOKENS,
        },
        { signal: controller.signal },
      );

      clearTimeout(timeoutId);

      const choice = response.choices?.[0];
      console.warn(
        `[remote.service] ${MODEL}: ${Date.now() - tLlamada} ms (intento ${intento + 1}, finish=${choice?.finish_reason ?? "?"}, tokens=${response.usage?.total_tokens ?? "?"})`,
      );
      /* `finish_reason: "length"` significa que el modelo se quedo sin sitio a
         mitad del json. Se distingue del resto de fallos porque la reparacion es
         distinta y el mensaje al usuario tiene que decir la verdad: no es que el
         modelo fallara, es que el formulario no cabia. */
      if (choice?.finish_reason === "length") {
        const err = new Error(
          "AI_PROVIDER_TRUNCATED: the form was too long for the model's output limit",
        );
        err.truncated = true;
        throw err;
      }

      return limpiarRazonamiento(choice?.message?.content ?? "");
    } catch (error) {
      const ultimo = intento === intentos - 1 || !esReintentable(error, intento);
      if (ultimo) {
        console.error(
          `[remote.service] ${describirError(error)} tras ${Date.now() - tLlamada} ms (intento ${intento + 1}/${intentos})`,
        );
        if (esTimeout(error)) {
          throw new Error(`AI provider timed out after ${env.aiTimeoutMs} ms`);
        }
        throw error;
      }
      const espera = esperaDe(error, intento);
      console.warn(
        `[remote.service] ${describirError(error)}; reintento ${intento + 1}/${intentos - 1} en ${espera} ms`,
      );
      await esperar(espera);
    }
  }

  /* Inalcanzable: el bucle o devuelve o lanza. */
  throw new Error("AI provider failed without an error");
}

/**
 * Genera texto libre (sin forzar JSON)
 * @param {string} prompt
 * @param {{ systemPrompt?: string }} [opts]
 * @returns {Promise<string>}
 */
export async function generateText(prompt, opts = {}) {
  const messages = [
    {
      role: "system",
      content: opts.systemPrompt || "You are a helpful assistant.",
    },
    { role: "user", content: prompt },
  ];

  return callAI(messages);
}

/**
 * Genera JSON estructurado siguiendo un schemaHint
 * @param {string} prompt
 * @param {{ schemaHint?: string, systemPrompt?: string }} [opts]
 * @returns {Promise<object>}
 */
export async function generateJson(prompt, opts = {}) {
  const systemContent =
    opts.systemPrompt ||
    "You are a precise JSON generator. Always respond with valid JSON only, no markdown, no explanation.";

  const userContent = opts.schemaHint
    ? `${prompt}\n\nRespond with JSON matching this shape:\n${opts.schemaHint}`
    : prompt;

  const messages = [
    { role: "system", content: systemContent },
    { role: "user", content: userContent },
  ];

  const raw = await callAI(messages, { jsonMode: true });

  // Limpiar markdown code blocks si el modelo los incluye.
  // NOTA: \x60 es el código hexadecimal del caracter backtick (`).
  // Usamos esto para evitar que el renderizador de markdown corte el código.
  const cleaned = raw
    .replace(/^\x60\x60\x60json\s*/i, "")
    .replace(/^\x60\x60\x60\s*/i, "")
    .replace(/\s*\x60\x60\x60$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("[remote.service] JSON parse failed:", err.message);
    console.error("[remote.service] Raw response:", raw);
    /* Un json cortado se reconoce a ojo: se queda sin cerrar. Se dice aparte
       porque "invalid JSON" hace pensar en que el modelo esta roto, cuando lo
       que ha pasado es que la respuesta era mas larga que el hueco disponible. */
    const sinCerrar =
      (cleaned.match(/[{[]/g) || []).length > (cleaned.match(/[}\]]/g) || []).length;
    if (sinCerrar) {
      const e = new Error(
        "AI_PROVIDER_TRUNCATED: the response stopped mid-JSON (unclosed braces)",
      );
      e.truncated = true;
      throw e;
    }
    throw new Error(`AI returned invalid JSON: ${err.message}`);
  }
}
