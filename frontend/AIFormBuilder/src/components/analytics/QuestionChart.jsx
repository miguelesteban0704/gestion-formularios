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
  const surveyTotal = Number(question.responses ?? question.total) || 0;

  return (
    <ChartCard
      icon={Icon}
      title={question.label}
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
