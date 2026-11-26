import { Star, MessageSquareText, Quote } from "lucide-react";
import { motion } from "framer-motion";
import { ChartCard } from "./ChartCard.jsx";
import PrismDonut from "./PrismDonut.jsx";
import { PrismBars } from "./PrismBars.jsx";
import { PRISM_PALS } from "./PrismPalette.js";
import { Tooltip } from "../ui/Tooltip.jsx";
import { FIELD_DEFS, RATING_TYPES } from "../../lib/fieldTypes.js";
import { useLanguage } from "../../contexts/LanguageContext.jsx";

/**
 * Renders the right visualization for one question's analytics.
 * Mismo lenguaje Prism que el resto de /analytics:
 *  · donut → PrismDonut (aro biselado + leyenda glass)
 *  · barras → PrismBars (filas glass con barra degradada)
 *  · texto libre → tarjetas de vidrio con comilla
 *
 * El total que encabeza cada tarjeta es el de respuestas reales de esa pregunta
 * (`total`: cuántas la contestaron), no el total de la encuesta (`responses`),
 * de modo que el subtítulo refleje cuántas personas respondieron realmente y
 * excluya a las que la dejaron en blanco (`skipped`).
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
  /* Total de respuestas REALES de esta pregunta (quienes la contestaron), no el
     total de la encuesta. El subtítulo debe reflejar cuántas personas respondieron
     realmente esta pregunta, excluyendo a las que la dejaron en blanco. */
  const surveyTotal = Number(question.total) || 0;

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

  /* ── Free-text samples (el backend devuelve todas; aquí mostramos todas) ── */
  if (question.samples) {
    const hasSamples = question.samples.length > 0;
    if (!hasSamples && skipped === 0) return <Empty />;
    return (
      <div className="space-y-2">
        {question.samples.map((s, i) => (
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
        {/* «Sin responder» como una entrada más del mismo desglose (tarjeta de
           vidrio igual que el resto de respuestas), nunca como texto aparte. */}
        {skipped > 0 && (
          <motion.div
            key="__skipped__"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-2.5 text-sm shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-800/40"
          >
            <div className="flex items-center gap-2.5">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{
                  background: "linear-gradient(135deg, #cbd5e1, #94a3b8)",
                  boxShadow: "0 0 10px #94a3b866",
                }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-sm font-medium text-slate-500 dark:text-slate-400">
                    {t("notAnswered")}
                  </span>
                  <span className="text-sm font-bold tabular-nums text-slate-500 dark:text-slate-400">
                    {skipped}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    );
  }

  const data = (question.breakdown || []).filter((d) => Number(d.count) > 0);

  /* Se añade «Sin responder» al desglose siempre que haya saltado contestado,
     de modo que aparezca como una más en el chart y no como texto aparte. */
  if (skipped > 0) {
    data.push({ label: t("notAnswered"), count: skipped });
  }

  if (!data.length) return <Empty />;

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
    </div>
  );
}

/* ── Clasificación por escala ──────────────────────────────────────────────
   Cada opción es una fila de vidrio con: el nombre de la opción, el número
   medio de la escala que le asignaron las personas (p. ej. «2.8 / 8») y
   cuántas la puntuaron. La barra crece con el promedio sobre el recorrido de
   la escala (mín→máx), de modo que "más alto" = prioridad media mayor.
   El número y el conteo llevan un Tooltip moderno que explica qué significa
   cada cifra (promedio, máximo de la escala, personas que puntuaron) y el
   rango total de la escala. */
function ImportanciaBreakdown({ question, skipped = 0 }) {
  const { t } = useLanguage();
  const rows = (question.breakdown || []).filter((d) => Number(d.count) > 0);
  const scale = question.scale || null;
  const min = Number(scale?.min) || 1;
  const max = Number(scale?.max) || 5;
  const span = Math.max(1, max - min);

  /* «Sin responder» entra como una fila más del desglose (personas que no
     puntuaron ninguna opción), sin puntuación media ni barra de progreso,
     para que aparezca dentro del mismo diseño que el resto de opciones. */
  const items = [...rows];
  if (skipped > 0) {
    items.push({ label: t("notAnswered"), count: skipped, isSkipped: true });
  }

  if (!items.length) return <Empty />;

  return (
    <div>
      <div className="space-y-1.5">
        {items.map((d, i) => {
          const isSkipped = d.isSkipped;
          const pal = PRISM_PALS[i % PRISM_PALS.length] || PRISM_PALS[0];
          const score = isSkipped
            ? null
            : d.averageScore != null
            ? Number(d.averageScore)
            : null;
          const pct =
            score != null ? Math.max(0, Math.min(100, ((score - min) / span) * 100)) : 0;
          return (
            <motion.div
              key={isSkipped ? "__skipped__" : d.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.06, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="relative overflow-hidden border border-slate-200/80 bg-slate-50/80 px-3.5 py-2.5 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-800/40 rounded-xl"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{
                    background: isSkipped
                      ? "linear-gradient(135deg, #cbd5e1, #94a3b8)"
                      : `linear-gradient(135deg, ${pal.light}, ${pal.base})`,
                    boxShadow: isSkipped ? "0 0 10px #94a3b866" : `0 0 10px ${pal.base}66`,
                  }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span
                      className={isSkipped ? "truncate text-sm font-medium text-slate-500 dark:text-slate-400" : "truncate text-sm font-medium text-slate-700 dark:text-slate-200"}
                      title={d.label}
                    >
                      {d.label}
                    </span>
                    {!isSkipped && score != null && (
                      <Tooltip
                        side="top"
                        align="end"
                        maxWidth={240}
                        className="shrink-0"
                        content={
                          <div className="space-y-1.5">
                            <p className="text-[10px] font-semibold uppercase tracking-wider opacity-60">
                              {t("scaleInfoTitle")}
                            </p>
                            <div className="space-y-1 text-xs leading-snug">
                              <div className="flex gap-2">
                                <span className="w-8 shrink-0 text-right font-bold tabular-nums">
                                  {score}
                                </span>
                                <span className="opacity-90">{t("scaleInfoAvg")}</span>
                              </div>
                              <div className="flex gap-2">
                                <span className="w-8 shrink-0 text-right font-bold tabular-nums">
                                  / {max}
                                </span>
                                <span className="opacity-90">{t("scaleInfoMax")}</span>
                              </div>
                              <div className="flex gap-2">
                                <span className="w-8 shrink-0 text-right font-bold tabular-nums">
                                  {d.count}
                                </span>
                                <span className="opacity-90">{t("scaleInfoCount")}</span>
                              </div>
                            </div>
                            <p className="border-t border-slate-200/70 pt-1 text-[10px] opacity-60 dark:border-slate-600/50">
                              {t("scaleInfoRange")}: {min}–{max}
                            </p>
                          </div>
                        }
                      >
                        <span
                          className="cursor-help text-sm font-bold tabular-nums"
                          style={{ color: pal.base, textShadow: `0 0 8px ${pal.base}55` }}
                        >
                          {score}
                          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                            {" "}
                            / {max}
                          </span>
                        </span>
                      </Tooltip>
                    )}
                  </div>
                  {!isSkipped && (
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
                  )}
                </div>
                <Tooltip
                  side="top"
                  align="end"
                  maxWidth={200}
                  className="shrink-0"
                  content={
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold leading-none tabular-nums">{d.count}</p>
                      <p className="text-xs leading-snug">{t("scaleInfoCount")}</p>
                    </div>
                  }
                >
                  <span className="cursor-help rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500 dark:bg-slate-700/50 dark:text-slate-300">
                    {d.count}
                  </span>
                </Tooltip>
              </div>
            </motion.div>
          );
        })}
      </div>
      </div>
  );
}

function Empty() {
  const { t } = useLanguage();
  return (
    <div className="py-8 text-center">
      <p className="text-sm font-medium text-slate-400 dark:text-slate-500">{t("noDataYet")}</p>
    </div>
  );
}
