import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, FileX2, X, LayoutDashboard, ShieldCheck, UserCircle2 } from "lucide-react";
import { guestApi } from "../services/index.js";
import { FormView } from "../components/public/FormView.jsx";
import { FormArtPanel } from "../components/public/FormArtPanel.jsx";
import { getTheme } from "../lib/themes.js";
import { PageLoader } from "../components/ui/Feedback.jsx";
import { LanguageSwitcher } from "../components/ui/LanguageSwitcher.jsx";
import { Button } from "../components/ui/Button.jsx";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { useRoleT } from "../lib/roleI18n.js";
import { getResolvedApiBase } from "../lib/api.js";
import { siteHomePath } from "../lib/roles.js";
import { decodeJwtPayload } from "../lib/jwtPayload.js";

const RID_KEY = "formly_rid";

/**
 * Respuesta pública (invitados, sin sesión de panel).
 * - Lo público se responde anónimamente.
 * - Lo privado exige identidad IDP: botón que redirige con `?return=/f/:slug`;
 *   al volver con `?rid=` se muestra el nombre (no editable) y se adjunta al envío.
 */
export default function PublicForm() {
  const { slug } = useParams();
  const { t } = useLanguage();
  const rt = useRoleT();
  const [form, setForm] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | gated | notfound | done
  const [submitting, setSubmitting] = useState(false);
  const [respondent, setRespondent] = useState(null);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rid = params.get("rid") || sessionStorage.getItem(`${RID_KEY}:${slug}`);
    if (params.get("rid")) {
      sessionStorage.setItem(`${RID_KEY}:${slug}`, params.get("rid"));
      const payload = decodeJwtPayload(params.get("rid"));
      if (payload?.sub) setRespondent({ sub: payload.sub, name: payload.name || payload.email || null });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (rid) {
      const payload = decodeJwtPayload(rid);
      if (payload?.sub) setRespondent({ sub: payload.sub, name: payload.name || payload.email || null });
    }
    guestApi
      .getForm(slug, rid)
      .then((f) => {
        setForm(f);
        // El backend solo entrega las preguntas de un privado con identidad
        // válida (rid); si aún exige auth es portón —aunque la URL traiga un
        // rid caducado—.
        setStatus(f.requiresAuth ? "gated" : "ready");
        startedAt.current = Date.now();
        document.title = f.settings?.seoTitle || f.title;
      })
      .catch(() => setStatus("notfound"));
  }, [slug]);

  const goIdp = () => {
    const apiUrl = getResolvedApiBase();
    window.location.assign(`${apiUrl}/auth/login?return=${encodeURIComponent(`/f/${slug}`)}`);
  };

  /* Devuelve si la respuesta llegó a guardarse. No es un detalle: `FormView`
     borra el borrador (lo que la persona llevaba escrito) solo ante un `true`,
     porque ante un fallo lo que tiene que sobrevivir es justamente ese
     borrador. Un `catch` que se traga el error y no dice nada dejaría el
     formulario limpio después de perder la respuesta. */
  const handleSubmit = async (answers) => {
    setSubmitting(true);
    try {
      const rid = sessionStorage.getItem(`${RID_KEY}:${slug}`);
      // Siempre por el canal de invitados: anónimo en lo público, con
      // identidad IDP (`rid`) en lo privado. Sin sesión de panel.
      await guestApi.submit(slug, {
        answers,
        completionTime: Math.round((Date.now() - startedAt.current) / 1000),
      }, rid);
      setStatus("done");
      window.scrollTo({ top: 0 });
      return true;
    } catch (err) {
      if (err.response?.status === 401) {
        setStatus("gated");
        return false;
      }
      toast.error(err.message || t("couldNotSubmit"));
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading") return <PageLoader label={t("loadingForm")} />;

  if (status === "notfound") {
    return (
      <div className="animate-page-enter relative flex min-h-screen flex-col items-center justify-center gap-4 bg-app px-6 text-center">
        <LanguageSwitcher className="absolute right-6 top-6" />
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-surface-2 text-muted">
          <FileX2 className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold text-fg">{t("formUnavailable")}</h1>
        <p className="max-w-sm text-muted">
          {t("formUnavailableDescription")}
        </p>
      </div>
    );
  }

  if (status === "done") return <SuccessScreen form={form} />;

  /* Formulario privado sin identidad: portón del IDP en vez del cuestionario. */
  if (status === "gated") {
    return (
      <div className="animate-page-enter relative flex min-h-screen flex-col items-center justify-center gap-4 bg-app px-6 text-center">
        <LanguageSwitcher className="absolute right-6 top-6" />
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-surface-2 text-muted">
          <ShieldCheck className="h-7 w-7" strokeWidth={1.5} />
        </div>
        <h1 className="max-w-md text-2xl font-bold text-fg">{form?.title}</h1>
        <p className="max-w-sm text-sm font-medium text-fg">{rt("requiresIdp")}</p>
        <p className="max-w-sm text-sm text-muted">{rt("requiresIdpDesc")}</p>
        <Button onClick={goIdp} className="mt-2">
          <ShieldCheck className="h-4 w-4" strokeWidth={1.5} /> {rt("continueWithIdp")}
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-page-enter relative min-h-screen">
      <LanguageSwitcher className="absolute right-6 top-6 z-20" />
      {/* Identidad verificada: visible pero discreta, nunca editable. */}
      {respondent && (
        <div className="pointer-events-none fixed left-1/2 top-4 z-30 -translate-x-1/2">
          <p className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-surface/90 px-3 py-1 text-xs text-muted shadow-soft backdrop-blur">
            <UserCircle2 className="h-3.5 w-3.5" strokeWidth={1.5} />
            {rt("answeringAs")}: <span className="font-medium text-fg">{respondent.name || respondent.sub}</span>
          </p>
        </div>
      )}
      <FormView form={form} onSubmit={handleSubmit} submitting={submitting} />
    </div>
  );
}

function SuccessScreen({ form }) {
  const { t, language } = useLanguage();
  const rt = useRoleT();
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = getTheme(form.theme);
  const accent = form.settings?.primaryColor || theme.accent;

  // Tras responder: sin sesión se vuelve a la puerta de acceso requerido
  // y el administrador con sesión vuelve a su panel.
  const destino = siteHomePath(user, language);
  const alPanel = destino !== "/";
  const handleClose = useCallback(() => {
    navigate(destino, { replace: true });
  }, [navigate, destino]);

  // Cierre con Escape — transparente para el usuario
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleClose]);

  return (
    <div className="animate-page-enter relative flex min-h-screen items-center justify-center overflow-hidden bg-[#fafafa] px-4 dark:bg-[#070a12]">
      {/* Soft accent illustration behind the card */}
      <FormArtPanel
        accent={accent}
        variant={theme.art}
        className="pointer-events-none absolute inset-0 opacity-60"
      />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 sm:p-9 text-center shadow-[0_30px_60px_-28px_rgba(16,24,40,0.30)] ring-1 ring-slate-900/[0.06] dark:bg-slate-900 dark:ring-white/[0.06] dark:shadow-[0_24px_48px_rgba(0,0,0,0.45)]">
        {/* X cerrar arriba a la derecha — transparente y accesible */}
        <button
          onClick={handleClose}
          aria-label={t("close")}
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <X className="h-4 w-4" />
        </button>

        <div
          className="mx-auto grid h-16 w-16 place-items-center rounded-full text-white animate-pop"
          style={{ background: accent, boxShadow: `0 10px 26px -8px ${accent}80` }}
        >
          <CheckCircle2 className="h-9 w-9" />
        </div>
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {form.settings?.thankYouMessage || t("thankYou")}
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t("responseRecorded")}</p>

        <div className="mt-7 flex flex-col gap-2">
          <Button onClick={handleClose} className="w-full justify-center">
            <LayoutDashboard className="h-4 w-4" />
            {alPanel ? t("backToDashboard") : rt("backToSite")}
          </Button>
          <p className="text-xs text-slate-400 dark:text-slate-500">{t("poweredBy")}</p>
        </div>
      </div>
    </div>
  );
}
