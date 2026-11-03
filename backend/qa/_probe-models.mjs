// Sonda 3: latencia por modelo en LLM7.
import OpenAI from "openai";
import { env } from "../config/env.js";

const MODELOS = ["gemini-3-flash", "glm-5.3", "minimax-m2.7", "deepseek-v4-flash:0731", "kimi-k2.6"];

const client = new OpenAI({ apiKey: env.aiApiKey, baseURL: env.aiBaseUrl, timeout: 60000, maxRetries: 0 });

for (const model of MODELOS) {
  const t0 = Date.now();
  try {
    const r = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: "Responde exactamente: OK" }],
      max_tokens: 10,
    });
    console.log(`${model}: texto OK en ${((Date.now() - t0) / 1000).toFixed(1)}s -> ${JSON.stringify(r.choices?.[0]?.message?.content)}`);
  } catch (e) {
    console.log(`${model}: texto FALLO en ${((Date.now() - t0) / 1000).toFixed(1)}s -> ${e.message}`);
  }
}
