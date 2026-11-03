// Sonda 5: limite de concurrencia de LLM7 con el modelo actual.
import OpenAI from "openai";
import { env } from "../config/env.js";

const client = new OpenAI({ apiKey: env.aiApiKey, baseURL: env.aiBaseUrl, timeout: 60000, maxRetries: 0 });
const one = (i) => client.chat.completions.create({
  model: env.aiModel,
  messages: [{ role: "user", content: `Devuelve {"n": ${i}} en JSON` }],
  response_format: { type: "json_object" },
  max_tokens: 20,
});

async function burst(n) {
  const t0 = Date.now();
  const res = await Promise.allSettled(Array.from({ length: n }, (_, i) => one(i)));
  const ok = res.filter((r) => r.status === "fulfilled").length;
  const errs = res.filter((r) => r.status === "rejected").map((r) => r.reason?.status || r.reason?.message);
  console.log(`concurrencia ${n}: ${ok}/${n} ok en ${((Date.now() - t0) / 1000).toFixed(1)}s`, errs.length ? errs : "");
}

await burst(1);
await new Promise((r) => setTimeout(r, 2000));
await burst(2);
await new Promise((r) => setTimeout(r, 2000));
await burst(4);
await new Promise((r) => setTimeout(r, 2000));
await burst(6);
