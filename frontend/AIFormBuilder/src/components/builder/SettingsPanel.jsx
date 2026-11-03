import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, Clock, Target, Users, Lightbulb, Check, Lock, Link2 } from "lucide-react";
import { THEME_LIST } from "../../lib/themes.js";
import { FormArtPanel } from "../public/FormArtPanel.jsx";
import { DoorOpenIcon } from "../ui/CategoryBadge.jsx";
import { LogoDropzone } from "./LogoDropzone.jsx";
import { Input, Textarea, Label } from "../ui/Input.jsx";
import { Switch } from "../ui/Switch.jsx";
import { Button } from "../ui/Button.jsx";
import { cn } from "../../lib/utils.js";
import { checkOnAccent } from "../../lib/accent.js";
import { aiApi, formApi } from "../../services/index.js";
import { useLanguage } from "../../contexts/LanguageContext.jsx";

// La misma paleta del sitio (lib/accent.js): el color del formulario se elige
// del mismo sitio que el color de la cuenta.
const COLORS = [
  "#00D2FF", // electric cyan
  "#9D4EDD", // neon violet
  "#FF007F", // fuchsia
  "#39FF14", // lime
  "#00E676", // emerald
  "#FF6B00", // coral
  "#1E293B", // slate
  "#2563EB", // electric blue
  "#D946EF", // magenta
];

/** Miniature theme preview: a light form sliver beside its art pattern. */
function ThemeThumb({ theme, accent }) {
  return (
    <div className="relative grid h-[4.5rem] w-full grid-cols-[1fr_1fr] overflow-hidden bg-white">
      <div className="p-2.5">
        <div className="h-1.5 w-4/5 rounded-full bg-slate-300" />
        <div className="mt-1.5 h-1 w-3/5 rounded-full bg-slate-200" />
        <div className="mt-2 h-2.5 w-full rounded-[3px] border border-slate-200" />
        <div className="mt-1.5 h-2.5 w-8 rounded-[3px]" style={{ background: accent }} />
      </div>
      <FormArtPanel accent={accent} variant={theme.art} cols={2} rows={3} className="h-full w-full" />
    </div>
  );
}

/** Right-rail editor for form-level settings: theme, branding, copy, SEO. */
export function SettingsPanel({ form, onChange, canManageVisibility = false, onVisibilityChange }) {
  // AI feature hidden - retained in code: `runSummary` used to call
  // `aiApi.formSummary(form)` and render an "AI insights" section with purpose,
  // audience, completion time and suggestions. The handler and its state are
  // gone; the component is kept intact for the backend contract.
  const [logoBusy, setLogoBusy] = useState(false);
  const { t } = useLanguage();

  const setSettings = (patch) => onChange({ settings: { ...form.settings, ...patch } });

  // Los tres estados de visibilidad y su ayuda. Mismo tratamiento visual para
  // la opción activa (decisión del diseño, como el `Segmented` del panel).
  const visibilityHints = {
    public: t("visibilityPublicHint"),
    unlisted: t("visibilityLinkOnlyHint"),
    private: t("visibilityPrivateHint"),
  };
  const visibilityButtonClass = (active) =>
    cn(
      "inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-colors",
      active
        ? "bg-brand-500/10 text-brand-700 shadow-soft dark:bg-brand-400/10 dark:text-brand-300"
        : "text-ink-muted hover:text-ink"
    );

  /* El logo NO pasa por `setSettings`: es un archivo y va en su propia
     petición multipart. El backend devuelve el formulario entero ya
     actualizado, así que se propaga con `onChange` tal cual y el resto de
     ajustes que el usuario tenga sin guardar sobreviven intactos (por eso el
     endpoint escribe con `jsonb_set` sobre una sola clave). */
  const handleLogoUpload = async (file) => {
    setLogoBusy(true);
    try {
      const updated = await formApi.uploadLogo(form._id, file);
      onChange(updated);
      toast.success(t("logoUploaded"));
    } catch (err) {
      // El mensaje técnico lo muestra el propio dropzone; aquí solo se avisa
      // de forma efimera para quien no está mirando esa zona.
      toast.error(err?.response?.data?.message || err?.message || "No se pudo subir el logo");
      throw err;
    } finally {
      setLogoBusy(false);
    }
  };

  const handleLogoRemove = async () => {
    setLogoBusy(true);
    try {
      const updated = await formApi.removeLogo(form._id);
      onChange(updated);
      toast.success(t("logoRemoved"));
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "No se pudo quitar el logo");
      throw err;
    } finally {
      setLogoBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Theme */}
      <Section title={t("theme")}>
        <div className="grid grid-cols-2 gap-2.5">
          {THEME_LIST.map((theme) => {
            const active = form.theme === theme.id;
            return (
              <button
                key={theme.id}
                onClick={() => onChange({ theme: theme.id })}
                className={cn(
                  "group relative overflow-hidden rounded-lg border bg-surface text-left transition-all",
                  active
                    ? "border-brand-500 ring-2 ring-brand-500/20"
                    : "border-default hover:border-brand-300 hover:shadow-soft"
                )}
              >
                <ThemeThumb theme={theme} accent={form.settings.primaryColor} />
                {active && (
                  <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-brand-600 text-white shadow-soft">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                )}
                <p className="px-2.5 py-1.5 text-xs font-medium text-fg">{t(`theme_${theme.id}`) || theme.label}</p>
              </button>
            );
          })}
        </div>
      </Section>

      {/* Branding */}
      <Section title={t("branding")}>
        <Label>{t("primaryColor")}</Label>
        <div className="grid grid-cols-6 gap-2">
          {COLORS.map((c) => {
            const active = form.settings.primaryColor?.toLowerCase() === c;
            return (
              <button
                key={c}
                onClick={() => setSettings({ primaryColor: c })}
                aria-label={c}
                className={cn(
                  "grid aspect-square place-items-center rounded-full transition-transform hover:scale-110",
                  active && "ring-2 ring-offset-2 ring-offset-surface"
                )}
                style={{ background: c, "--tw-ring-color": c }}
              >
                {active && <Check className="h-3.5 w-3.5" strokeWidth={3} style={{ color: checkOnAccent(c) }} />}
              </button>
            );
          })}
        </div>
        <label className="mt-2.5 flex cursor-pointer items-center gap-2 rounded-xl border border-default bg-surface-2 px-3 py-2 text-sm text-muted transition-colors hover:border-brand-300">
          <span
            className="h-5 w-5 rounded-full ring-1 ring-black/10"
            style={{ background: form.settings.primaryColor }}
          />
          <span className="flex-1 font-medium text-fg">{t("customColor")}</span>
          <span className="font-mono text-xs uppercase">{form.settings.primaryColor}</span>
          <input
            type="color"
            value={form.settings.primaryColor}
            onChange={(e) => setSettings({ primaryColor: e.target.value })}
            className="h-0 w-0 opacity-0"
          />
        </label>

        {/* ── Logo ────────────────────────────────────────────────────────
            El selector de archivo va primero porque es el caso normal, y la URL
            queda debajo y plegada: sigue haciendo falta para un logo servido
            desde un CDN, pero no es lo que la mayoria de los autores va a usar,
            y un campo de texto desnudo ocupando media fila del panel es ruido
            cuando lo que se quiere es subir un fichero. */}
        <div className="mt-4">
          <Label>{t("formLogo")}</Label>
          <LogoDropzone
            logoUrl={form.settings.logo}
            uploading={logoBusy}
            onUpload={handleLogoUpload}
            onRemove={handleLogoRemove}
            labels={{
              title: t("uploadLogo"),
              replace: t("replaceLogo"),
              remove: t("removeLogo"),
              uploading: t("uploadingLogo"),
              hint: t("logoHint"),
              broken: t("logoBroken"),
              errorType: t("logoErrorType"),
              errorSize: t("logoErrorSize"),
            }}
          />

          <div className="mt-3">
            <Label>{t("logoUrl")}</Label>
            <Input
              value={form.settings.logo}
              placeholder="https://…/logo.png"
              onChange={(e) => setSettings({ logo: e.target.value })}
            />
            <p className="mt-1 text-[11px] leading-snug text-muted">
              {t("logoHint")}
            </p>
          </div>
        </div>

        {/* ── Visibilidad ──────────────────────────────────────────────────
            Solo lo ve el CREADOR de formularios (lo pasa el Builder): lo
            privado (unlisted) y lo restringido exigen entidad, y el
            invitado del sitio no tiene una, así que el selector no debe
            aparecerle. El cambio va por `onVisibilityChange` (endpoint dedicado
            y auditado), NO por el autosave. Misma voz que el `Segmented` del
            panel: activa en marca, resto en neutro. */}
        {canManageVisibility && (
          <div className="mt-4">
            <Label>{t("formVisibility")}</Label>
            <div
              className="grid grid-cols-3 gap-1 rounded-xl border border-default bg-surface-2/70 p-1"
              role="group"
              aria-label={t("formVisibility")}
            >
              <button
                type="button"
                aria-pressed={form.visibility === "public"}
                onClick={() => onVisibilityChange?.("public")}
                className={visibilityButtonClass(form.visibility === "public")}
              >
                <DoorOpenIcon className="h-4 w-4" aria-hidden="true" />
                {t("visibilityPublic")}
              </button>
              <button
                type="button"
                aria-pressed={form.visibility === "unlisted"}
                onClick={() => onVisibilityChange?.("unlisted")}
                className={visibilityButtonClass(form.visibility === "unlisted")}
              >
                <Link2 className="h-4 w-4" aria-hidden="true" />
                {t("visibilityLinkOnly")}
              </button>
              <button
                type="button"
                aria-pressed={form.visibility === "private"}
                onClick={() => onVisibilityChange?.("private")}
                className={visibilityButtonClass(form.visibility === "private")}
              >
                <Lock className="h-4 w-4" aria-hidden="true" />
                {t("visibilityPrivate")}
              </button>
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-muted">
              {visibilityHints[form.visibility] || t("visibilityPublicHint")}
            </p>
          </div>
        )}

        <div className="mt-3">
          <Label>{t("borderRadius")} - {form.settings.borderRadius}px</Label>
          <input
            type="range"
            min="0"
            max="28"
            value={form.settings.borderRadius}
            onChange={(e) => setSettings({ borderRadius: Number(e.target.value) })}
            className="w-full accent-brand-600"
          />
        </div>
      </Section>

      {/* Copy */}
      <Section title={t("messages")}>
        <Label>{t("submitButtonText")}</Label>
        <Input value={form.settings.submitButtonText} onChange={(e) => setSettings({ submitButtonText: e.target.value })} />
        <div className="mt-3">
          <Label>{t("thankYouMessage")}</Label>
          <Textarea
            rows={2}
            value={form.settings.thankYouMessage}
            onChange={(e) => setSettings({ thankYouMessage: e.target.value })}
          />
        </div>
        <div className="mt-3 rounded-xl border border-default bg-surface-2 p-3">
          <Switch
            checked={form.settings.showProgressBar}
            onChange={(v) => setSettings({ showProgressBar: v })}
            label={t("showProgress")}
          />
        </div>
      </Section>

      {/* SEO */}
      <Section title={t("seo")}>
        <Label>{t("seoTitle")}</Label>
        <Input value={form.settings.seoTitle} placeholder={form.title} onChange={(e) => setSettings({ seoTitle: e.target.value })} />
        <div className="mt-3">
          <Label>{t("seoDescription")}</Label>
          <Textarea rows={2} value={form.settings.seoDescription} onChange={(e) => setSettings({ seoDescription: e.target.value })} />
        </div>
      </Section>

      {/* AI feature hidden - retained in code: the "AI insights" section used to
          render here (Sparkles → runSummary → aiApi.formSummary, showing purpose,
          audience, completion time and suggestions). The handler and its state are
          gone; the component is kept intact for the backend contract. */}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="mb-2.5 text-sm font-semibold text-fg">{title}</h3>
      {children}
    </div>
  );
}

function Insight({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
      <div>
        <span className="font-medium text-fg">{label}: </span>
        <span className="text-muted">{value}</span>
      </div>
    </div>
  );
}
