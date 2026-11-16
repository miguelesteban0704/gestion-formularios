import { generateJson } from "./remote.service.js";
import { formRepo } from "../repositories/form.repo.js";

const LANGS = ["es", "en"];

function asText(v) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function pickI18n(value, lng, fallback = "") {
  if (value == null) return fallback;
  if (typeof value === "string") return value || fallback;
  if (typeof value === "object") return value[lng] ?? value.es ?? value.en ?? fallback;
  return fallback;
}

function ensureLangObj(base, original, fieldKey) {
  const out = { ...(base && typeof base === "object" ? base : {}) };
  // If base came from inline *_i18n, it may already have langs
  const src = pickI18n(out, "es", "") || pickI18n(out, "en", "") || asText(original);
  for (const lang of LANGS) {
    if (!asText(out[lang]).trim() && src) out[lang] = src;
  }
  // if still empty, keep empty strings to avoid undefined surprises
  for (const lang of LANGS) if (typeof out[lang] !== "string") out[lang] = asText(out[lang]);
  return out;
}

function detectSourceLang(form, questions) {
  // crude heuristic: prefer existing Spanish content markers, else default to es
  const sample = [
    asText(form?.title),
    asText(form?.description),
    ...questions.flatMap((q) => [asText(q.label), asText(q.description), asText(q.placeholder)]),
  ]
    .join(" ")
    .toLowerCase();
  if (/[áéíóúñ¿¡]/.test(sample)) return "es";
  return "es";
}

function collectTranslatable(form, questions, existing) {
  const items = [];
  const push = (key, text, ctx = "") => {
    const t = asText(text).trim();
    if (!t) return;
    items.push({ key, text: t, ctx });
  };

  push("form.title", form.title, "form title");
  push("form.description", form.description, "form description");

  for (const q of questions || []) {
    const qid = q.id;
    const qExisting = existing?.[qid] || {};
    push(`q.${qid}.label`, pickI18n(qExisting.label, "es", q.label), "question label");
    push(`q.${qid}.description`, pickI18n(qExisting.description, "es", q.description), "question description");
    push(`q.${qid}.placeholder`, pickI18n(qExisting.placeholder, "es", q.placeholder), "question placeholder");
    push(`q.${qid}.helpText`, pickI18n(qExisting.helpText, "es", q.helpText), "help text");
    if (q.scale) {
      push(`q.${qid}.scale.minLabel`, pickI18n(qExisting.scale?.minLabel, "es", q.scale.minLabel), "scale min label");
      push(`q.${qid}.scale.maxLabel`, pickI18n(qExisting.scale?.maxLabel, "es", q.scale.maxLabel), "scale max label");
    }
    if (Array.isArray(q.options)) {
      for (const opt of q.options) {
        const optExisting = qExisting.options?.[opt.id]?.label;
        push(`q.${qid}.opt.${opt.id}.label`, pickI18n(optExisting, "es", opt.label), "option label");
      }
    }
    if (STATIC_TYPES.has(q.type) && asText(q.content).trim()) {
      push(`q.${qid}.content`, pickI18n(qExisting.content, "es", q.content), "static content");
    }
  }

  // dedupe by key
  const map = new Map();
  for (const it of items) if (!map.has(it.key)) map.set(it.key, it);
  return [...map.values()];
}

const STATIC_TYPES = new Set(["heading", "paragraph", "message", "section", "image"]);

async function translateMissing(items, sourceLang, targetLang) {
  if (!items.length) return {};
  // Batch translate; ask for JSON map key->translation
  const payload = items.map((it) => ({ key: it.key, text: it.text, context: it.ctx }));
  const prompt = `Translate the following UI strings from ${sourceLang} to ${targetLang}. Return ONLY a JSON object mapping each key to the translated string. Keep meaning natural for a form/survey UI. Preserve placeholders, numbers, punctuation style when appropriate. Do not add extra keys.\n\n${JSON.stringify(payload)}`;
  try {
    const data = await generateJson(prompt, { maxTokens: 2048 });
    if (data && typeof data === "object" && !Array.isArray(data)) {
      // normalize values to strings
      const out = {};
      for (const [k, v] of Object.entries(data)) out[k] = asText(v);
      return out;
    }
  } catch {
    // fallback below
  }
  // fallback: copy source text
  const out = {};
  for (const it of items) out[it.key] = it.text;
  return out;
}

function getTranslated(map, key, fallback) {
  const v = asText(map?.[key]).trim();
  return v || fallback || "";
}

export async function ensureFormI18n(form, { persist = false } = {}) {
  const questions = Array.isArray(form?.questions) ? form.questions : [];
  const existing = form?.questions_i18n && typeof form.questions_i18n === "object" ? { ...form.questions_i18n } : {};
  const sourceLang = detectSourceLang(form, questions);
  const targetLang = sourceLang === "es" ? "en" : "es";

  // Seed from inline *_i18n if present
  for (const q of questions) {
    const qid = q.id;
    const qe = existing[qid] || (existing[qid] = {});
    qe.label = ensureLangObj(qe.label || q.label_i18n, q.label, "label");
    if (asText(q.description) || q.description_i18n || qe.description) qe.description = ensureLangObj(qe.description || q.description_i18n, q.description);
    if (asText(q.placeholder) || q.placeholder_i18n || qe.placeholder) qe.placeholder = ensureLangObj(qe.placeholder || q.placeholder_i18n, q.placeholder);
    if (asText(q.helpText) || q.helpText_i18n || qe.helpText) qe.helpText = ensureLangObj(qe.helpText || q.helpText_i18n, q.helpText);
    if (q.scale || qe.scale) {
      qe.scale = qe.scale || {};
      if (asText(q.scale?.minLabel) || q.scale_i18n?.minLabel || qe.scale.minLabel) qe.scale.minLabel = ensureLangObj(qe.scale.minLabel || q.scale_i18n?.minLabel, q.scale?.minLabel);
      if (asText(q.scale?.maxLabel) || q.scale_i18n?.maxLabel || qe.scale.maxLabel) qe.scale.maxLabel = ensureLangObj(qe.scale.maxLabel || q.scale_i18n?.maxLabel, q.scale?.maxLabel);
    }
    if (STATIC_TYPES.has(q.type) && (asText(q.content) || q.content_i18n || qe.content)) {
      qe.content = ensureLangObj(qe.content || q.content_i18n, q.content);
    }
    if (Array.isArray(q.options)) {
      qe.options = qe.options || {};
      for (const opt of q.options) {
        const oe = qe.options[opt.id] || (qe.options[opt.id] = {});
        oe.label = ensureLangObj(oe.label || opt.label_i18n, opt.label);
        if (opt.value != null) oe.value = opt.value;
      }
    }
  }

  // Find items missing in target lang
  const allItems = collectTranslatable(form, questions, existing);
  const missing = allItems.filter((it) => {
    // locate in existing structure
    if (it.key === "form.title") return !asText(form?.title_i18n?.[targetLang]).trim();
    if (it.key === "form.description") return !asText(form?.description_i18n?.[targetLang]).trim();
    const m = it.key.match(/^q\.([^.]+)\.(.+)$/);
    if (!m) return false;
    const [, qid, rest] = m;
    const qe = existing[qid] || {};
    if (rest === "label") return !asText(qe.label?.[targetLang]).trim();
    if (rest === "description") return !asText(qe.description?.[targetLang]).trim();
    if (rest === "placeholder") return !asText(qe.placeholder?.[targetLang]).trim();
    if (rest === "helpText") return !asText(qe.helpText?.[targetLang]).trim();
    if (rest === "content") return !asText(qe.content?.[targetLang]).trim();
    if (rest === "scale.minLabel") return !asText(qe.scale?.minLabel?.[targetLang]).trim();
    if (rest === "scale.maxLabel") return !asText(qe.scale?.maxLabel?.[targetLang]).trim();
    const om = rest.match(/^opt\.([^.]+)\.label$/);
    if (om) return !asText(qe.options?.[om[1]]?.label?.[targetLang]).trim();
    return false;
  });

  const translated = await translateMissing(missing, sourceLang, targetLang);

  // Apply translations into questions_i18n and inline fields for compatibility
  const formTitleI18n = ensureLangObj(form?.title_i18n, form?.title);
  const formDescI18n = ensureLangObj(form?.description_i18n, form?.description);
  if (!asText(formTitleI18n[targetLang]).trim()) formTitleI18n[targetLang] = getTranslated(translated, "form.title", formTitleI18n[sourceLang] || asText(form?.title));
  if (!asText(formDescI18n[targetLang]).trim()) formDescI18n[targetLang] = getTranslated(translated, "form.description", formDescI18n[sourceLang] || asText(form?.description));

  for (const q of questions) {
    const qid = q.id;
    const qe = existing[qid] || (existing[qid] = {});
    const apply = (obj, key, inlineKey) => {
      if (!obj) return;
      if (!asText(obj[targetLang]).trim()) obj[targetLang] = getTranslated(translated, key, obj[sourceLang] || "");
      if (inlineKey) q[inlineKey] = { ...(q[inlineKey] && typeof q[inlineKey] === "object" ? q[inlineKey] : {}), ...obj };
    };
    apply(qe.label, `q.${qid}.label`, "label_i18n");
    if (qe.description) apply(qe.description, `q.${qid}.description`, "description_i18n");
    if (qe.placeholder) apply(qe.placeholder, `q.${qid}.placeholder`, "placeholder_i18n");
    if (qe.helpText) apply(qe.helpText, `q.${qid}.helpText`, "helpText_i18n");
    if (qe.content) apply(qe.content, `q.${qid}.content`, "content_i18n");
    if (qe.scale?.minLabel) { if (!asText(qe.scale.minLabel[targetLang]).trim()) qe.scale.minLabel[targetLang] = getTranslated(translated, `q.${qid}.scale.minLabel`, qe.scale.minLabel[sourceLang]); }
    if (qe.scale?.maxLabel) { if (!asText(qe.scale.maxLabel[targetLang]).trim()) qe.scale.maxLabel[targetLang] = getTranslated(translated, `q.${qid}.scale.maxLabel`, qe.scale.maxLabel[sourceLang]); }
    if (qe.scale) {
      q.scale_i18n = {
        ...(q.scale_i18n || {}),
        ...(qe.scale.minLabel ? { minLabel: { ...(q.scale_i18n?.minLabel || {}), ...qe.scale.minLabel } } : {}),
        ...(qe.scale.maxLabel ? { maxLabel: { ...(q.scale_i18n?.maxLabel || {}), ...qe.scale.maxLabel } } : {}),
      };
    }
    if (Array.isArray(q.options) && qe.options) {
      for (const opt of q.options) {
        const oe = qe.options[opt.id];
        if (!oe?.label) continue;
        if (!asText(oe.label[targetLang]).trim()) oe.label[targetLang] = getTranslated(translated, `q.${qid}.opt.${opt.id}.label`, oe.label[sourceLang] || asText(opt.label));
        opt.label_i18n = { ...(opt.label_i18n && typeof opt.label_i18n === "object" ? opt.label_i18n : {}), ...oe.label };
      }
    }
  }

  const next = {
    ...form,
    title_i18n: formTitleI18n,
    description_i18n: formDescI18n,
    questions_i18n: existing,
    questions,
  };

  if (persist && form?.id) {
    try {
      await formRepo.updateForm(form.id, {
        questionsI18n: existing,
        questions,
        // keep title/description base strings unchanged
      });
    } catch {
      // non-fatal: return enriched form anyway
    }
  }

  return next;
}
