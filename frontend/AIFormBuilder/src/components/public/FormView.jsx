import { useMemo, useState } from "react";
import { toast } from "sonner";
import { HeartHandshake } from "lucide-react";
import { FieldRenderer } from "./FieldRenderer.jsx";
import { FormArtPanel } from "./FormArtPanel.jsx";
import { getTheme } from "../../lib/themes.js";
import {
  isStatic,
  isQuestionVisible,
  isConsentDeclined,
  visibleRenderList,
} from "../../lib/fieldTypes.js";
import { validateField, validateForm } from "../../lib/validate.js";
import { checkOnAccent } from "../../lib/accent.js";
import { assetUrl } from "../../lib/api.js";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import { getSpecialFieldType } from "../../lib/fieldTypes.js";

/* Borrador de lo que llevaba escrito, para sobrevivir al salto al IDP.
 *
 * Al poner los formularios detrás del IDP aparece un momento en el que la
 * persona está escribiendo y, sin embargo, el sitio le pide que se identifique:
 * se le cayó la sesión, cerró otras sesiones en otro dispositivo, o el enlace
 * lo abrió en una pestaña donde no había iniciado sesión. Ese salto es una
 * navegación de página completa y el estado de React se pierde con ella.
 *
 * `sessionStorage` y no `localStorage` a propósito: es un borrador de una sola
 * persona en una sola pestaña, y caduca al cerrarla (los datos de un formulario
 * de un centro de gobierno no tienen nada que hacer durando semanas en un
 * disco). Se borra en cuanto el envío sale bien. */
const BORRADOR = (slug) => `formly_borrador_${slug || "sin-slug"}`;

function leerBorrador(slug) {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const crudo = sessionStorage.getItem(BORRADOR(slug));
    if (!crudo) return null;
    const datos = JSON.parse(crudo);
    if (!datos || typeof datos !== "object" || Array.isArray(datos)) return null;
    return datos.respuestas && typeof datos.respuestas === "object" ? datos.respuestas : null;
  } catch {
    // Un borrador corrupto no puede impedir abrir el formulario: se descarta.
    return null;
  }
}

function guardarBorrador(slug, respuestas, preview = false) {
  if (typeof sessionStorage === "undefined" || preview) return;
  try {
    if (!respuestas || Object.keys(respuestas).length === 0) {
      sessionStorage.removeItem(BORRADOR(slug));
      return;
    }
    sessionStorage.setItem(BORRADOR(slug), JSON.stringify({ respuestas }));
  } catch {
    // Cuota llena o modo privado: se sigue rellenando, simplemente sin copia.
  }
}

function borrarBorrador(slug) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(BORRADOR(slug));
  } catch {
    // Nada que hacer: sin borrador no hay nada que ensuciar.
  }
}

/**
 * Renders a complete, fillable form on a clean light surface. On wide screens
 * it's a split layout: the form on the left, a soft bauhaus illustration
 * (tinted by the form's accent) on the right. `preview` renders the form-only
 * column and disables network submit.
 */
export function FormView({ form, preview = false, onSubmit, submitting = false }) {
  const { t, language } = useLanguage();
  const theme = getTheme(form.theme);
  const accent = form.settings?.primaryColor || theme.accent;
  const accentInk = checkOnAccent(accent);
  const gradientTarget = accentInk === "#000000" ? "white" : "black";
  /* Estado inicial perezoso: el borrador se lee UNA vez al montar. Leerlo en un
     efecto dejaría un render con las respuestas vacías y, si el envío saliera en
     ese instante, mandaría un formulario en blanco. */
  const [answers, setAnswers] = useState(() => (preview ? {} : leerBorrador(form.slug) || {}));
  const [errors, setErrors] = useState({});
  /* El fallo del logo se guarda junto a la URL que falló, y se resuelve
     durante el render en vez de reiniciarse en un efecto: así un logo nuevo no
     hereda el fallo del anterior y no hay ningún render con el estado viejo. */
  const [logoFailedFor, setLogoFailedFor] = useState("");
  const logoUrl = form.settings?.logo || "";
  const logoFailed = logoUrl !== "" && logoFailedFor === logoUrl;

  /* En preview se muestran todas las preguntas, ignorando la lógica
     condicional (`visibleIf`): el objetivo es ver cómo queda el formulario
     completo, no simular respuestas. Se hace una copia ligera sin el campo
     `visibleIf` para no mutar el estado original. */
  const previewQuestions = useMemo(
    () => preview ? form.questions.map((q) => (q?.visibleIf ? { ...q, visibleIf: null } : q)) : form.questions,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.questions, preview],
  );
  const answerable = useMemo(
    () => previewQuestions.filter((q) => !isStatic(q.type) && isQuestionVisible(q, answers)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.questions, JSON.stringify(answers)],
  );
  /* Lo que se pinta: las secciones huérfanas no se pintan (ver
     `visibleRenderList`), así que al responder No en un sí/no del que dependen
     preguntas, el formulario se encoge solo. */
  const rendered = useMemo(
    () => visibleRenderList(previewQuestions, answers),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.questions, JSON.stringify(answers)],
  );
  const answeredCount = answerable.filter((q) => {
    const v = answers[q.id];
    return v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0);
  }).length;
  const progress = answerable.length ? Math.round((answeredCount / answerable.length) * 100) : 0;

  /* Puerta de consentimiento: la primera pregunta marcada como tal que esté
     contestada con un No cierra la encuesta con agradecimiento. */
  const gate = useMemo(
    () => form.questions.find((q) => q?.isConsentGate && !isStatic(q?.type)),
    [form.questions],
  );
  const gatedOut = gate ? isConsentDeclined(gate, answers[gate.id]) : false;

  const setAnswer = (id, value) => {
    let next = answers;
    setAnswers((prev) => {
      next = { ...prev, [id]: value };
      const changedType = getSpecialFieldType(form.questions.find((item) => item.id === id) || {});
      for (const question of form.questions) {
        if (changedType === "province" && getSpecialFieldType(question) === "municipality") {
          next[question.id] = "";
        }
        /* Lo que se oculta se borra: una respuesta en un campo invisible no se
           envía, no cuenta en el progreso y no puede bloquear el envío como
           obligatoria fantasma. */
        if (next[question.id] !== undefined && next[question.id] !== "" && !isQuestionVisible(question, next)) {
          delete next[question.id];
        }
      }
      guardarBorrador(form.slug, next, preview);
      return next;
    });
    /* Validación en vivo: al escribir se revisa ESE campo (y el que se vació a
       causa de una dependencia provincia→municipio). Así el respondiente ve el
       error mientras escribe, no al pulsar Enviar. Un campo que aún está vacío no
       se marca (solo se limpia su error previo). */
    const field = form.questions.find((q) => q.id === id);
    setErrors((prev) => {
      const updated = { ...prev };
      const touched = [field, ...form.questions.filter((q) => next[q.id] === "" && prev[q.id])].filter(Boolean);
      for (const q of touched) {
        const err = validateField(q, next[q.id], t, language);
        if (err) updated[q.id] = err;
        else delete updated[q.id];
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    /* Solo lo visible se valida: lo oculto por condición no existe para quien
       responde y no puede exigir nada. */
    const found = validateForm(answerable, answers, t, language);
    if (Object.keys(found).length) {
      setErrors(found);
      const faltan = Object.keys(found).length;
      const primera = answerable.find((q) => found[q.id]);
      /* `t` no interpola: el `{count}` se sustituye aquí, igual que hace
         `validate.js` con sus mensajes. */
      toast.error(
        String(t("validationErrors")).replace("{count}", String(faltan)) +
          (primera ? ` — ${String(primera.label).slice(0, 60)}` : ""),
      );
      const firstId = Object.keys(found)[0];
      document.getElementById(`q-${firstId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const payload = answerable
      .filter((q) => answers[q.id] !== undefined && answers[q.id] !== "")
      .map((q) => ({ questionId: q.id, value: answers[q.id] }));
    /* El borrador se borra solo si el envío se confirmó. Si falla (red caída,
       sesión caducada) lo que estaba escrito tiene que seguir ahí para el
       reintento; borrarlo en el `finally` dejaría a la persona con el
       formulario vacío y sin explicación. `onSubmit` devuelve si se llegó a
       guardar. */
    const guardado = await onSubmit?.(payload);
    if (guardado) borrarBorrador(form.slug);
  };

  const formBody = (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-xl px-6 py-12 sm:px-10 lg:px-12">
          <header className="mb-8">
            {/* El logo vive en la cabecera, a la izquierda del bloque de texto, y
                en móvil se apila encima de él. Es la posición que usan Linear,
                Vercel y Stripe: da presencia de marca arriba del todo sin robar
                altura a las preguntas, que es lo que importa cuando el formulario
                tiene quince campos.

                Antes iba solo, en una línea por encima del título; con el título al
                lado se aprovecha el ancho vacío que dejaba y la marca deja de
                parecer un adorno pegado.

                Sin logo, la raya de acento se queda haciendo de ancla visual, así
                que la cabecera nunca queda vacía ni descuadrada. */}
            <div className="flex items-start gap-4 sm:gap-5">
              {/* El logo se oculta si la imagen no carga, para no dejar un hueco
                  roto en la cabecera. `logoFailed` se reinicia cuando cambia la
                  URL para que un logo nuevo no herede el fallo del anterior. */}
              {logoUrl && !logoFailed && (
                <img
                  key={logoUrl}
                  src={assetUrl(logoUrl)}
                  alt=""
                  onError={() => setLogoFailedFor(logoUrl)}
                  /* `max-h` en vez de `h` fijo: un PNG de 512px se muestra a la
                     misma altura que uno de 64px y ninguno de los dos descuadra
                     la cabecera. `shrink-0` impide que el texto lo aplaste. */
                  className="max-h-11 w-auto max-w-[45%] shrink-0 object-contain object-left"
                  loading="eager"
                />
              )}
              <div className="min-w-0 flex-1">
                {/* La raya de acento depende de si el logo se está MOSTRANDO, no
                    de si el campo viene relleno: si la imagen falla y la raya
                    tampoco salía, la cabecera perdía su ancla visual entera. */}
                {(!logoUrl || logoFailed) && (
                  <div
                    aria-hidden="true"
                    className="mb-3 h-1 w-10 rounded-full"
                    style={{ background: accent }}
                  />
                )}
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{form.title}</h1>
                {form.description && (
                  <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{form.description}</p>
                )}
              </div>
            </div>
          </header>

          <div className="space-y-6 text-slate-900 dark:text-slate-100">
            {rendered.map((q) => {
              /* Solo las respondibles se enumeran y solo entre las visibles:
                 lo oculto por condición no cuenta ni deja huecos en la serie. */
              const n = isStatic(q.type)
                ? null
                : answerable.findIndex((a) => a.id === q.id) + 1;
              return (
                <div key={q.id} id={`q-${q.id}`}>
                  {n > 0 && (
                    /* Numeración premium: círculo con degradado del acento,
                       filete hasta el contador "n / total". Es decorativa
                       (aria-hidden): la pregunta se anuncia por su etiqueta. */
                    <div aria-hidden="true" className="mb-2.5 flex items-center gap-2.5">
                      <span
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold"
                        style={{
                          color: accentInk,
                          background: `linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 82%, ${gradientTarget}))`,
                          boxShadow: `0 4px 12px -4px ${accent}66`,
                        }}
                      >
                        {n}
                      </span>
                      <span className="h-px flex-1 bg-slate-200/70 dark:bg-slate-700/60" />
                      <span className="font-mono text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                        {n} / {answerable.length}
                      </span>
                    </div>
                  )}
                  <FieldRenderer
                    field={q}
                    value={answers[q.id]}
                    onChange={(val) => setAnswer(q.id, val)}
                    error={errors[q.id]}
                    accent={accent}
                    language={language}
                    answers={answers}
                    questions={form.questions}
                  />
                </div>
              );
            })}
          </div>

          {answerable.length > 0 && (
            <button
              type="submit"
              disabled={submitting}
              className="mt-9 w-full rounded-lg py-3 text-sm font-semibold transition-all hover:brightness-[1.07] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60"
              style={{
                color: accentInk,
                background: `linear-gradient(145deg, ${accent}, color-mix(in srgb, ${accent} 84%, ${gradientTarget}))`,
                boxShadow: `0 8px 22px -8px ${accent}80`,
              }}
            >
              {submitting ? t("submitting") : form.settings?.submitButtonText || t("submit")}
            </button>
          )}

          {preview && (
            <p className="mt-3 text-center text-xs text-slate-400 dark:text-slate-500">{t("previewMode")}</p>
          )}

          <p className="mt-10 text-center text-xs text-slate-400 dark:text-slate-500">{t("poweredBy")}</p>
        </form>
  );

  const progressBar = form.settings?.showProgressBar && answerable.length > 0 && (
    <div className="sticky top-0 z-10 h-1 w-full bg-slate-100 dark:bg-slate-800">
      <div className="h-full transition-all duration-300" style={{ width: `${progress}%`, background: accent }} />
    </div>
  );

  /* Salida por no consentimiento: se registra SOLO la respuesta de la puerta
     (el servidor la guarda como declinada y no exige nada más) y se da las
     gracias sin hacer más preguntas. En vista previa el botón no envía nada. */
  const handleDecline = async () => {
    if (!gate || preview) return;
    const guardado = await onSubmit?.([{ questionId: gate.id, value: answers[gate.id] }]);
    if (guardado) borrarBorrador(form.slug);
  };

  if (gatedOut) {
    return (
      <div className="animate-page-enter relative flex min-h-screen items-center justify-center px-4 bg-app">
        <div className="relative w-full max-w-md rounded-2xl bg-white p-6 sm:p-9 text-center shadow-[0_30px_60px_-28px_rgba(16,24,40,0.30)] ring-1 ring-slate-900/[0.06] dark:bg-slate-900 dark:ring-white/[0.06]">
          <div
            className="mx-auto grid h-16 w-16 place-items-center rounded-full text-white animate-pop"
            style={{ background: accent, boxShadow: `0 10px 26px -8px ${accent}80` }}
          >
            <HeartHandshake className="h-9 w-9" />
          </div>
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t("gateTitle")}
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t("gateMessage")}</p>
          <button
            type="button"
            onClick={handleDecline}
            disabled={submitting || preview}
            className="mt-7 w-full rounded-lg py-3 text-sm font-semibold text-white transition-all hover:brightness-[1.07] disabled:opacity-60"
            style={{ background: `linear-gradient(145deg, ${accent}, ${shade(accent, -16)})` }}
          >
            {submitting ? t("submitting") : t("finish")}
          </button>
          {preview && (
            <p className="mt-3 text-center text-xs text-slate-400 dark:text-slate-500">{t("previewMode")}</p>
          )}
        </div>
      </div>
    );
  }

  // Preview (builder modal): form-only; the modal owns the scroll.
  if (preview) {
    return (
      <div className="bg-white dark:bg-slate-900 transition-colors duration-200 min-h-full">
        {progressBar}
        {formBody}
      </div>
    );
  }

  // Public page: split layout with the illustration on the right.
  return (
    <div className="grid min-h-screen grid-cols-1 lg:h-screen lg:grid-cols-[1fr_minmax(0,42%)] xl:grid-cols-[1fr_minmax(0,46%)]">
      <div className="relative flex min-h-screen flex-col bg-white dark:bg-slate-900 lg:h-screen transition-colors duration-200">
        {progressBar}
        <div className="flex-1 overflow-y-auto scrollbar-thin">{formBody}</div>
      </div>
      <FormArtPanel accent={accent} variant={theme.art} className="hidden lg:block" />
    </div>
  );
}