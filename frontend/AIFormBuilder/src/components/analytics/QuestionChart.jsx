import { Star, MessageSquareText, Quote } from "lucide-react";
import { motion } from "framer-motion";
import { ChartCard } from "./ChartCard.jsx";
import PrismDonut from "./PrismDonut.jsx";
import { PrismBars } from "./PrismBars.jsx";
import { PRISM_PALS } from "./PrismPalette.js";
import { FIELD_DEFS, RATING_TYPES } from "../../lib/fieldTypes.js";
import { useLanguage } from "../../contexts/LanguageContext.jsx";

/* Tipos en los que cada persona aporta EXACTAMENTE un valor al desglose. Son
   los únicos donde "Sin responder" puede sumarse a las opciones sin falsear la
   cuenta. En `checkbox` una persona puede marcar varias; en `rank` e
   `importancia` cada opción se cuenta por separado. */
const SINGLE_VALUE_TYPES = new Set([
  "dropdown",
  "radio",
  "yes_no",
  "province",
  "municipality",
  "gender",
  "education_level",
]);

const countsSkippedAsSegment = (question) =>
  SINGLE_VALUE_TYPES.has(question.type) ||
  RATING_TYPES.includes(question.type) ||
  question.type === "number";

/**
 * Renders the right visualization for one question's analytics.
 * Mismo lenguaje Prism que el resto de /analytics:
 *  · donut → PrismDonut (aro biselado + leyenda glass)
 *  · barras → PrismBars (filas glass con barra degradada)
 *  · texto libre → tarjetas de vidrio con comilla
 *
 * El total que encabeza cada tarjeta es el de la encuesta (`responses`), igual
 * que el KPI general. `total` sigue siendo la cuenta de quienes contestaron y
 * `skipped` los que la dejaron en blanco: el desglose nunca cambia de
 * denominador sin decirlo.
 */
export function QuestionChart({ question }) {
  const { t } = useLanguage();
  const def = FIELD_DEFS[question.type];
  const Icon = def?.icon || MessageSquareText;
  const typeKey = `field_${question.type}`;
  const typeLabel = t(typeKey) !== typeKey ? t(typeKey) : def?.label || question.type;
  /* Si la etiqueta de la pregunta sigue siendo el valor por defecto en inglés
     (p. ej. «Province», «Municipality» creados por IA/plantillas), se muestra
     el nombre de tipo ya traducido por LanguageContext en su lugar. Así el
     desglose no presenta en inglés campos que el resto de la UI ve en español. */
  const isDefaultLabel = !question.label || question.label === def?.label;
  const title = isDefaultLabel ? typeLabel : question.label;
  const surveyTotal = Number(question.responses ?? question.total) || 0;

  return (
    <ChartCard
      icon={Icon}
      title={title}
      subtitle={`${surveyTotal} ${(surveyTotal === 1 ? t("response") : t("responses")).toLowerCase()} · ${typeLabel}`}
      right={
        question.average != null ? (
          <div className="flex items-center gap-1.5 rounded-xl border border-amber-200/70 bg-amber-50 px-2.5 py-1.5 text-sm font-bold text-amber-600 shadow-sm dark:border-amber-400/25 dark:bg-amber-500/10 dark:text-amber-300">
            <Star className="h-3.5 w-3.5 fill-current" />
            {question.average}
          </div>
        ) : null
      }
    >
      <QuestionBody question={question} />
    </ChartCard>
  );
}

function QuestionBody({ question }) {
  const { t } = useLanguage();
  const skipped = Math.max(0, Number(question.skipped) || 0);

  /* ── Free-text samples (máx. 4 por tarjeta — el backend devuelve todas) ── */
  if (question.samples) {
    if (!question.samples.length) return <Empty skipped={skipped} />;
    const MAX_SAMPLES = 4;
    const shown = question.samples.slice(0, MAX_SAMPLES);
    const showingAll = question.samples.length <= MAX_SAMPLES;
    return (
      <div className="space-y-2">
        {shown.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.055, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-2.5 text-sm text-slate-700 shadow-sm backdrop-blur-sm transition-all hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-200 dark:hover:border-slate-700"
          >
            <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-400/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100 dark:via-white/25" />
            <Quote className="absolute right-3 top-2 h-5 w-5 rotate-180 text-slate-300/70 transition-colors group-hover:text-amber-300/70 dark:text-slate-700" />
            <span className="relative">{s}</span>
          </motion.div>
        ))}
        {!showingAll && (
          <p className="pt-1 text-center text-[11px] font-medium text-slate-400 dark:text-slate-500">
            {t("showing")} {shown.length} / {question.samples.length}
          </p>
        )}
        {skipped > 0 && <SkippedNote skipped={skipped} />}
      </div>
    );
  }

  const data = (question.breakdown || []).filter((d) => Number(d.count) > 0);

  /* En las preguntas de valor único el desglose suma exactamente quienes
     contestaron; se añade «Sin responder» para que el gráfico sume el mismo
     total que la encuesta. En selección múltiple / ranking / escala esto no
     aplica: cada persona puede aportar varias marcas, así que solo se anota
     aparte. */
  if (countsSkippedAsSegment(question) && skipped > 0) {
    data.push({ label: t("notAnswered"), count: skipped });
  }

  if (!data.length) return <Empty skipped={skipped} />;

  /* ── Clasificación por escala: cada opción muestra el número de la escala
     que eligieron las personas (promedio) junto a cuántas la puntuaron. ── */
  if (question.type === "importancia") {
    return <ImportanciaBreakdown question={question} skipped={skipped} />;
  }

  /* ── Donut Prism para yes_no y conjuntos pequeños (≤ 4 opciones) ── */
  if (
    question.type === "yes_no" ||
    (!RATING_TYPES.includes(question.type) && question.type !== "number" && data.length <= 4)
  ) {
    return <PrismDonut data={data.map((d) => ({ label: d.label, value: d.count }))} palette={PRISM_PALS} idBase={`q-${question.id}`} />;
  }

  /* ── Barras horizontales Prism para conjuntos grandes / escalas / número ── */
  return (
    <div>
      <PrismBars data={data.map((d) => ({ label: d.label, value: d.count }))} />
      {skipped > 0 && !countsSkippedAsSegment(question) && <SkippedNote skipped={skipped} />}
    </div>
  );
}

/* ── Clasificación por escala ──────────────────────────────────────────────
   Cada opción es una fila de vidrio con: el nombre de la opción, el número
   medio de la escala que le asignaron las personas (p. ej. «2.8 / 8») y
   cuántas la puntuaron. La barra crece con el promedio sobre el recorrido de
   la escala (mín→máx), de modo que "más alto" = prioridad media mayor. */
function ImportanciaBreakdown({ question, skipped = 0 }) {
  const { t } = useLanguage();
  const rows = (question.breakdown || []).filter((d) => Number(d.count) > 0);
  const scale = question.scale || null;
  const min = Number(scale?.min) || 1;
  const max = Number(scale?.max) || 5;
  const span = Math.max(1, max - min);

  if (!rows.length) return <Empty skipped={skipped} />;

  return (
    <div>
      <div className="space-y-1.5">
        {rows.map((d, i) => {
          const pal = PRISM_PALS[i % PRISM_PALS.length] || PRISM_PALS[0];
          const score = d.averageScore != null ? Number(d.averageScore) : null;
          const pct =
            score != null ? Math.max(0, Math.min(100, ((score - min) / span) * 100)) : 0;
          return (
            <motion.div
              key={d.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.06, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50/80 px-3.5 py-2.5 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-800/40"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{
                    background: `linear-gradient(135deg, ${pal.light}, ${pal.base})`,
                    boxShadow: `0 0 10px ${pal.base}66`,
                  }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span
                      className="truncate text-sm font-medium text-slate-700 dark:text-slate-200"
                      title={d.label}
                    >
                      {d.label}
                    </span>
                    {score != null && (
                      <span
                        className="shrink-0 text-sm font-bold tabular-nums"
                        style={{ color: pal.base, textShadow: `0 0 8px ${pal.base}55` }}
                      >
                        {score}
                        <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                          {" "}
                          / {max}
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700/60">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{
                        duration: 0.8,
                        ease: [0.16, 1, 0.3, 1],
                        delay: 0.25 + i * 0.05,
                      }}
                      className="h-full rounded-full"
                      style={{
                        background: `linear-gradient(90deg, ${pal.deep}, ${pal.base} 55%, ${pal.light})`,
                      }}
                    />
                  </div>
                </div>
                <span
                  className="shrink-0 rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500 dark:bg-slate-700/50 dark:text-slate-300"
                  title={t("responses")}
                >
                  {d.count}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
      {skipped > 0 && <SkippedNote skipped={skipped} />}
    </div>
  );
}

function SkippedNote({ skipped }) {
  const { t } = useLanguage();
  return (
    <p className="pt-3 text-center text-[11px] font-medium text-slate-400 dark:text-slate-500">
      {skipped} {t("notAnswered").toLowerCase()}
    </p>
  );
}

function Empty({ skipped = 0 }) {
  const { t } = useLanguage();
  return (
    <div className="py-8 text-center">
      <p className="text-sm font-medium text-slate-400 dark:text-slate-500">{t("noDataYet")}</p>
      {skipped > 0 && (
        <p className="mt-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
          {skipped} {t("notAnswered").toLowerCase()}
        </p>
      )}
    </div>
  );
}
