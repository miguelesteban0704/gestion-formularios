import axios from "axios";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Servicio de inferencia local usando Ollama
 *
 * Se usa como fallback cuando:
 * 1. El proveedor remoto falla (timeouts, 429, 5xx)
 * 2. Se agota la cuota del proveedor remoto
 * 3. El usuario prefiere inferencia local por privacidad
 *
 * Ollama debe estar corriendo localmente con el modelo especificado en OLLAMA_MODEL
 * Por defecto: llama3.1:8b o qwen2.5:7b
 */

// Configuración del cliente Ollama
const ollamaClient = axios.create({
  baseURL: (env.ollama?.apiUrl || "http://localhost:11434").replace(/\/$/, ""),
  timeout: env.ollama?.timeoutMs || 120000, // 2 min por defecto para inferencia local
});

/**
 * Construye el prompt con schema hint para JSON
 */
function buildPrompt(prompt, schemaHint = "") {
  return `${prompt}

${schemaHint ? `Return ONLY valid minified JSON matching this shape:\n${schemaHint}` : ""}
Do not include markdown code fences or any prose. Output JSON only.`;
}

/**
 * Verifica si Ollama está disponible y el modelo está cargado
 */
export async function checkOllamaHealth() {
  try {
    const { data } = await ollamaClient.get("/api/tags", { timeout: 5000 });
    const models = data?.models || [];
    const modelName = env.ollama?.model || "llama3.1:8b";
    const modelExists = models.some(m => m.name === modelName || m.name.startsWith(modelName.split(":")[0]));

    return {
      available: true,
      modelLoaded: modelExists,
      models: models.map(m => m.name),
      currentModel: modelName,
    };
  } catch (err) {
    return {
      available: false,
      error: err.message,
    };
  }
}

/**
 * Genera JSON estructurado usando Ollama
 * @param {string} prompt - Prompt para el modelo
 * @param {Object} opts - Opciones
 * @param {string} opts.schemaHint - Pista del schema JSON esperado
 * @param {number} opts.maxTokens - Máximo de tokens de salida
 * @returns {Promise<Object>} - Objeto JSON parseado
 */
export async function generateJson(prompt, { schemaHint = "", maxTokens = 8192 } = {}) {
  const text = await requestModel(buildPrompt(prompt, schemaHint), true, maxTokens);
  return parseJson(text);
}

/**
 * Genera texto libre usando Ollama
 * @param {string} prompt - Prompt para el modelo
 * @param {number} maxTokens - Máximo de tokens de salida
 * @returns {Promise<string>} - Texto generado
 */
export async function generateText(prompt, maxTokens = 8192) {
  return requestModel(prompt, false, maxTokens);
}

/**
 * Realiza la petición al modelo Ollama con reintentos y backoff
 */
async function requestModel(prompt, json, maxTokens) {
  const maxRetries = env.ollama?.maxRetries || 2;
  const model = env.ollama?.model || "llama3.1:8b";

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const { data } = await ollamaClient.post("/api/generate", {
        model,
        prompt,
        stream: false,
        ...(json ? { format: "json" } : {}),
        options: {
          temperature: json ? 0.2 : 0.7,
          num_predict: maxTokens,
          top_p: 0.9,
        },
      });

      const text = data?.response?.trim();
      if (!text) throw new Error("Ollama returned an empty response");

      console.warn(`[ollama.service] ${model}: ${json ? "JSON" : "text"} generated successfully`);
      return text;

    } catch (err) {
      const isLastAttempt = attempt === maxRetries;

      if (isLastAttempt) {
        const detail = err.response?.data?.error || err.message;
        console.error(`[ollama.service] Failed after ${maxRetries + 1} attempts: ${detail}`);
        throw ApiError.internal(
          `Ollama request failed. Check that Ollama is running and model '${model}' is available: ${detail}`,
        );
      }

      // Backoff exponencial: 1s, 2s, 4s...
      const waitMs = 1000 * 2 ** attempt;
      console.warn(`[ollama.service] Attempt ${attempt + 1} failed: ${err.message}; retrying in ${waitMs}ms`);
      await new Promise(r => setTimeout(r, waitMs));
    }
  }
}

/**
 * Parsea JSON de la respuesta de Ollama
 * Maneja code fences, texto extra, y JSON truncado
 */
function parseJson(raw) {
  let cleaned = raw.trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();

  // Buscar el primer { o [ y el último } o ]
  const firstBrace = cleaned.search(/[{[]/);
  const lastBrace = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    // Intentar reparar JSON común: llaves sin cerrar
    const openBraces = (cleaned.match(/{/g) || []).length;
    const closeBraces = (cleaned.match(/}/g) || []).length;
    const openBrackets = (cleaned.match(/\[/g) || []).length;
    const closeBrackets = (cleaned.match(/]/g) || []).length;

    let repaired = cleaned;
    for (let i = 0; i < openBraces - closeBraces; i++) repaired += "}";
    for (let i = 0; i < openBrackets - closeBrackets; i++) repaired += "]";

    try {
      return JSON.parse(repaired);
    } catch {
      throw ApiError.internal("AI returned malformed JSON. Please try again.");
    }
  }
}

/**
 * Genera embeddings para búsqueda semántica (opcional)
 */
export async function generateEmbedding(text) {
  try {
    const { data } = await ollamaClient.post("/api/embeddings", {
      model: env.ollama?.embeddingModel || "nomic-embed-text",
      prompt: text,
    });
    return data?.embedding;
  } catch (err) {
    console.error(`[ollama.service] Embedding generation failed: ${err.message}`);
    return null;
  }
}

/**
 * Wrapper function that tries Ollama and falls back to a simple response
 * Useful when Ollama is not available or times out
 */
export async function generateJsonWithFallback(prompt, { schemaHint = "", maxTokens = 8192 } = {}) {
  if (!env.ollama?.enabled) {
    throw new Error("Ollama is disabled");
  }

  try {
    return await generateJson(prompt, { schemaHint, maxTokens });
  } catch (err) {
    console.warn(`[ollama.service] Ollama JSON generation failed, returning fallback: ${err.message}`);
    // Return a basic structured response as fallback
    return getFallbackJsonResponse(prompt, schemaHint);
  }
}

export async function generateTextWithFallback(prompt, maxTokens = 8192) {
  if (!env.ollama?.enabled) {
    throw new Error("Ollama is disabled");
  }

  try {
    return await generateText(prompt, maxTokens);
  } catch (err) {
    console.warn(`[ollama.service] Ollama text generation failed, returning fallback: ${err.message}`);
    return getFallbackTextResponse(prompt);
  }
}

/**
 * Provides a basic fallback JSON response when Ollama is unavailable
 */
function getFallbackJsonResponse(prompt, schemaHint) {
  // Try to extract the expected structure from schemaHint
  let fallback = {
    title: "Formulario generado (fallback)",
    description: "Este formulario fue generado usando el modo de respaldo porque Ollama no está disponible.",
    questions: [
      {
        type: "short_text",
        label: "Nombre",
        required: true,
        options: [],
        description: "Tu nombre completo"
      },
      {
        type: "email",
        label: "Correo electrónico",
        required: true,
        options: [],
        description: "Tu correo electrónico"
      },
      {
        type: "long_text",
        label: "Comentarios",
        required: false,
        options: [],
        description: "Tus comentarios o sugerencias"
      }
    ]
  };

  // If we can detect it's a survey, add more questions
  if (prompt.toLowerCase().includes("encuesta") || prompt.toLowerCase().includes("survey")) {
    fallback.questions.push(
      {
        type: "radio",
        label: "¿Cómo calificarías tu experiencia?",
        required: true,
        options: ["Muy mala", "Mala", "Regular", "Buena", "Muy buena"],
        description: "Selecciona una opción"
      },
      {
        type: "checkbox",
        label: "¿Qué características te gustan más?",
        required: false,
        options: ["Facilidad de uso", "Velocidad", "Diseño", "Funcionalidad", "Otras"],
        description: "Selecciona todas las que apliquen"
      }
    );
  }

  return fallback;
}

/**
 * Provides a basic fallback text response when Ollama is unavailable
 */
function getFallbackTextResponse(prompt) {
  return `[Respuesta generada en modo fallback - Ollama no disponible]

Prompt recibido: ${prompt.substring(0, 200)}...

Por favor, verifica que Ollama esté corriendo localmente con el modelo configurado.
Puedes iniciar Ollama con: ollama serve
Y descargar un modelo con: ollama pull llama3.1:8b`;
}

export default {
  generateJson,
  generateText,
  generateEmbedding,
  checkOllamaHealth,
  generateJsonWithFallback,
  generateTextWithFallback,
};