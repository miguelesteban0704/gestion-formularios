import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings as SettingsIcon,
  User,
  Palette,
  Check,
  Laptop,
  Monitor,
  Moon,
  Sun,
} from "lucide-react";

import { settingsApi } from "../services/index.js";
import { useTheme } from "../hooks/useTheme.js";
import { useLanguage, DEFAULT_LANGUAGE } from "../contexts/LanguageContext.jsx";
import { DEFAULT_ACCENT } from "../lib/accent.js";
import { setAppearanceExplicitSave } from "../components/settings/appearanceSaveGate.js";
import { useUpdateAppearance } from "../hooks/useSettings.js";
import SessionsPanel from "../components/settings/SessionsPanel.jsx";
import UserProfileSettings from "../components/settings/UserProfileSettings.jsx";
import { PageHeader } from "./Insights.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Label } from "../components/ui/Input.jsx";
import { Button } from "../components/ui/Button.jsx";
import { AccentPicker } from "../components/settings/AccentPicker.jsx";
import { cn } from "../lib/utils.js";

export default function Settings() {
  const { t } = useLanguage();
  const [tab, setTab] = useState("appearance");

  const TABS = [
    { id: "perfil", icon: User, label: t("tabProfile") },
    { id: "appearance", icon: Palette, label: t("tabAppearance") },
    { id: "devices", icon: Laptop, label: t("tabDevices") },
  ];

  return (
    <div className="animate-page-enter mx-auto max-w-6xl px-4 py-8 lg:px-8">
      <PageHeader icon={SettingsIcon} title={t("settings")} subtitle={t("settingsSubtitle")} />

      {/* Nav móvil: pills con scroll horizontal */}
      <nav className="mt-8 flex gap-2 overflow-x-auto pb-1.5 lg:hidden" aria-label="Secciones de ajustes">
        {TABS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border px-4 py-2 text-sm font-medium transition-all",
              tab === id
                ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-200"
                : "border-default bg-surface text-muted hover:text-fg",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>

      <div className="mt-6 flex flex-col gap-6 lg:mt-8 lg:flex-row lg:items-start lg:gap-10">
        {/* Sidebar desktop */}
        <aside className="hidden w-60 shrink-0 flex-col gap-1 lg:flex" aria-label="Secciones de ajustes">
          {TABS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              aria-current={tab === id ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-lg border px-3.5 py-2.5 text-left text-sm font-medium transition-all duration-150",
                tab === id
                  ? "border-brand-200 bg-brand-50 text-brand-700 shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:border-brand-800/70 dark:bg-brand-900/25 dark:text-brand-200"
                  : "border-transparent text-muted hover:bg-surface-2 hover:text-fg dark:hover:bg-slate-800/60",
              )}
            >
              <span
                className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors",
                  tab === id
                    ? "bg-brand-100 text-brand-700 dark:bg-brand-900/60 dark:text-brand-200"
                    : "bg-surface-2 text-muted group-hover:text-fg dark:bg-slate-800",
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              {label}
              {tab === id && <Check className="ml-auto h-4 w-4 text-brand-600 dark:text-brand-300" strokeWidth={3} />}
            </button>
          ))}
        </aside>

        {/* Contenido con transición */}
        <div className="min-w-0 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-5"
            >
              {tab === "perfil" && <UserProfileSettings />}
              {tab === "appearance" && <AppearanceSettings />}
              {tab === "devices" && <SessionsPanel />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Apariencia (colores) ────────────────────────── */

function AppearanceSettings() {
  const { t } = useLanguage();
  const { theme, setTheme, accent, setAccent } = useTheme();
  const { language, changeLanguage } = useLanguage();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: settingsApi.get });

  // Guardado explícito: mientras esta pestaña está abierta, PreferencesSync no
  // autoguarda. Solo el botón "Guardar cambios" persiste tema+acento+idioma.
  useEffect(() => {
    setAppearanceExplicitSave(true);
    return () => setAppearanceExplicitSave(false);
  }, []);

  const saved = settings
    ? {
        theme: settings.theme,
        accentColor: settings.accentColor,
        language: settings.language,
      }
    : null;

  // ¿Hay cambios sin persistir respecto a lo que el backend tiene en la cuenta?
  const dirty =
    Boolean(saved) &&
    (theme !== saved.theme ||
      (accent || "").toLowerCase() !== (saved.accentColor || "").toLowerCase() ||
      language !== saved.language);

  // Un único camino de guardado: el hook emite UN toast que nace en carga y se
  // actualiza en el mismo sitio (tracked). Sin spinner duplicado en el botón.
  const persisted = useUpdateAppearance();

  const discard = () => {
    if (!saved) return;
    setTheme(saved.theme || "system");
    setAccent(saved.accentColor || DEFAULT_ACCENT);
    changeLanguage(saved.language || DEFAULT_LANGUAGE);
  };

  // Los pickers actualizan el contexto (vista previa en vivo) pero NO persisten.
  const pickTheme = setTheme;
  const pickAccent = setAccent;
  const pickLanguage = changeLanguage;

  return (
    <Section icon={Palette} title={t("appearance")} desc={t("appearanceDescription")}>
      <div className="mb-7">
        <Label className="mb-3">{t("themeSection")}</Label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ThemeOption active={theme === "system"} onClick={() => pickTheme("system")} icon={Monitor} label={t("system")} mode="system" />
          <ThemeOption active={theme === "dark"} onClick={() => pickTheme("dark")} icon={Moon} label={t("dark")} mode="dark" />
          <ThemeOption active={theme === "light"} onClick={() => pickTheme("light")} icon={Sun} label={t("light")} mode="light" />
        </div>
      </div>

      <div className="mb-7">
        <Label className="mb-1">{t("languageSection")}</Label>
        <p className="mb-3 text-xs text-muted">{t("languageDesc")}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <LanguageOption active={language === "es"} onClick={() => pickLanguage("es")} code="es" label="Español" />
          <LanguageOption active={language === "en"} onClick={() => pickLanguage("en")} code="en" label="English" />
        </div>
      </div>

      <div>
        <Label className="mb-1">{t("accentSection")}</Label>
        <p className="mb-3 text-xs text-muted">{t("accentDesc")}</p>
        <AccentPicker
          value={accent}
          onChange={pickAccent}
          resetLabel={t("resetAccent")}
          customLabel={t("accentCustom")}
          customDesc={t("accentCustomDesc")}
          invalidHex={t("accentInvalidHex")}
          previewLabel={t("accentPreview")}
          previewButton={t("accentPreviewButton")}
          previewChip={t("accentPreviewChip")}
          previewTooltip={t("accentPreviewTooltip")}
        />
      </div>

      {/* Barra de guardado explícito: tema + acento + idioma se persisten aquí. */}
      <div
        className={cn(
          "mt-7 flex flex-col gap-3 rounded-2xl border p-4 transition-colors sm:flex-row sm:items-center sm:justify-between",
          dirty
            ? "border-brand-300 bg-brand-50/50 dark:border-brand-700/50 dark:bg-brand-900/15"
            : "border-default bg-surface dark:border-slate-700",
        )}
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-fg">{dirty ? t("unsavedChanges") : t("appearanceUpToDate")}</p>
          <p className="mt-0.5 text-xs text-muted">{t("appearanceSaveHint")}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={discard}
            disabled={!dirty || persisted.isPending}
          >
            {t("discardChanges")}
          </Button>
          <Button
            size="sm"
            loading={persisted.isPending}
            disabled={!dirty}
            onClick={() => persisted.mutate({ theme, accentColor: accent, language })}
          >
            {t("saveAppearance")}
          </Button>
        </div>
      </div>
    </Section>
  );
}

/* ─────────────────────────── Helpers de UI ─────────────────────────────── */

function Section({ icon: Icon, title, desc, action, children }) {
  return (
    <Card className="p-5">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
            <Icon className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-fg">{title}</h3>
            {desc && <p className="text-xs text-muted">{desc}</p>}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </Card>
  );
}

function ThemeOption({ active, onClick, icon: Icon, label, mode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "overflow-hidden rounded-lg border-2 text-left transition-all",
        active ? "border-brand-500 ring-2 ring-brand-500/15" : "border-default hover:border-brand-300",
      )}
    >
      <ThemePreview mode={mode} />
      <span className="flex items-center gap-2.5 p-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-fg">
          <Icon className="h-4.5 w-4.5" />
        </span>
        <span className="truncate text-sm font-medium text-fg">{label}</span>
        {active && <Check className="ml-auto h-4 w-4 shrink-0 text-brand-600" strokeWidth={3} />}
      </span>
    </button>
  );
}

function LanguageOption({ active, onClick, code, label }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center gap-3 rounded-lg border-2 p-3.5 text-left transition-all",
        active ? "border-brand-500 ring-2 ring-brand-500/15" : "border-default hover:border-brand-300",
      )}
    >
      <span className={cn("flag-icon", code === "es" ? "flag-es" : "flag-en")} aria-hidden="true" />
      <span className="truncate text-sm font-medium text-fg">{label}</span>
      {active && <Check className="ml-auto h-4 w-4 shrink-0 text-brand-600" strokeWidth={3} />}
    </button>
  );
}

function ThemePreview({ mode }) {
  const dark = mode === "dark";
  const sys = mode === "system";
  return (
    <span
      aria-hidden
      className={cn(
        "block border-b border-default px-3 pb-2.5 pt-3",
        dark ? "bg-slate-900" : sys ? "bg-gradient-to-r from-white from-50% to-slate-900 to-50%" : "bg-white",
      )}
    >
      <span className="flex items-center gap-1">
        <i className={cn("h-1.5 w-1.5 rounded-full", dark ? "bg-slate-600" : "bg-slate-300")} />
        <i className={cn("h-1.5 w-1.5 rounded-full", dark ? "bg-slate-600" : "bg-slate-300")} />
        <i className={cn("h-1.5 w-1.5 rounded-full", dark ? "bg-slate-600" : "bg-slate-300")} />
        <i className={cn("ml-2 h-1.5 flex-1 rounded-full", dark ? "bg-slate-700" : "bg-slate-200")} />
      </span>
      <span className="mt-2 flex gap-1.5">
        <i className={cn("h-6 w-5 rounded", dark ? "bg-slate-700/70" : "bg-slate-200/80")} />
        <span className="flex flex-1 flex-col gap-1">
          <i className={cn("h-1.5 w-3/4 rounded-full", dark ? "bg-slate-600" : "bg-slate-300")} />
          <i className="h-1.5 w-full rounded-full bg-brand-500/70" />
          <i className={cn("h-1.5 w-2/3 rounded-full", dark ? "bg-slate-700" : "bg-slate-200")} />
        </span>
      </span>
    </span>
  );
}
