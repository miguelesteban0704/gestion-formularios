import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  Search,
  LayoutDashboard,
  Plus,
  LayoutTemplate,
  BarChart3,
  Monitor,
  Moon,
  Sun,
  LogOut,
  FileText,
  CornerDownLeft,
  Inbox,
  Settings,
  Zap,
  FolderOpen,
} from "lucide-react";
import { cn } from "../lib/utils.js";
import { isGuest, isEntityAdmin, isCreator } from "../lib/roles.js";
import { useTheme } from "../hooks/useTheme.js";
import { useAuth } from "../hooks/useAuth.js";
import { formApi } from "../services/index.js";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { useFocusTrap, useBodyScrollLock, useEscapeKey } from "../hooks/useOverlay.ts";
import { BACKDROP_Z, MODAL_Z } from "./ui/Modal.tsx";
import { builderPath, homePath, inboxPath, insightsPath, settingsPath, siteBuilderPath, templatesPath } from "../lib/routes.js";

/**
 * Global Ctrl/Cmd+K command palette with actions, navigation and form search.
 *
 * Mejoras:
 *  - Secciones con headers (Acciones / Mis formularios) estilo cmdk.
 *  - Skeleton shimmer mientras cargan los formularios.
 *  - El item activo hace scrollIntoView (nunca se pierde fuera de vista).
 *  - Guard contra items.length === 0 (evita NaN en el índice activo).
 *  - Roles ARIA: dialog + combobox/listbox/option con aria-selected.
 */
export function CommandPalette({ open, setOpen }) {
  const navigate = useNavigate();
  const { toggle, theme } = useTheme();
  const { isAuthenticated, loading: authLoading, logout, user } = useAuth();
  const { t, language } = useLanguage();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [forms, setForms] = useState([]);
  const [loadingForms, setLoadingForms] = useState(false);
  const panelRef = useRef(null);

  // El foco no se roba (el input usa autoFocus) pero sí queda atrapado en
  // el diálogo, y el body deja de hacer scroll detrás.
  useFocusTrap(panelRef, open, { autoFocus: false });
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    if (authLoading) {
      setLoadingForms(true);
      return;
    }
    if (!isAuthenticated) {
      setForms([]);
      setLoadingForms(false);
      return;
    }
    setLoadingForms(true);
    formApi
      .list()
      .then(setForms)
      .catch(() => setForms([]))
      .finally(() => setLoadingForms(false));
  }, [open, isAuthenticated, authLoading]);

  // Limpieza inmediata al cerrar sesión
  useEffect(() => {
    if (!isAuthenticated) setForms([]);
  }, [isAuthenticated]);

  /* Sin sesión (o con sesión de invitado) las órdenes apuntan al SITIO, no
     al panel: cualquier ruta del panel pasaría por ProtectedRoute y acabaría
     en el IDP, que es justo lo que un invitado no debe encontrarse. */
  const enElSitio = !isAuthenticated || isGuest(user);

  /* Los usuarios de entidad (entity_admin y form_creator) componen sus rutas
     del panel con el slug de SU entidad; el super_admin/legacy, sin slug. */
  const entityCode = user?.entity?.code;

  const actions = useMemo(() => {
    const accionTema = {
      id: "theme",
      label: `${t("theme")}: ${
        theme === "dark" ? t("darkMode").toLowerCase() : theme === "light" ? t("lightMode").toLowerCase() : t("systemMode").toLowerCase()
      }`,
      icon: theme === "system" ? Monitor : theme === "dark" ? Moon : Sun,
      run: toggle,
    };

    if (enElSitio) {
      // Sin área pública no hay destinos del sitio: solo el tema.
      return [accionTema];
    }

    // Gestor de entidad y gestor de formularios: sin ajustes.
    const sinAjustes = isEntityAdmin(user) || isCreator(user);

    return [
      { id: "dashboard", label: t("commandDashboard"), icon: LayoutDashboard, run: () => navigate(homePath(language, entityCode)) },
      { id: "new", label: t("commandBlank"), icon: Plus, run: () => navigate(builderPath(language, "new", {}, entityCode)) },
      { id: "insights", label: t("commandInsights"), icon: BarChart3, run: () => navigate(insightsPath(language, entityCode)) },
      { id: "inbox", label: t("commandInbox"), icon: Inbox, run: () => navigate(inboxPath(language, entityCode)) },
      { id: "templates", label: t("commandTemplates"), icon: LayoutTemplate, run: () => navigate(templatesPath(language, entityCode)) },
      ...(!sinAjustes ? [{ id: "settings", label: t("commandSettings"), icon: Settings, run: () => navigate(settingsPath(language, entityCode)) }] : []),
      accionTema,
      { id: "logout", label: t("logOut"), icon: LogOut, run: logout },
    ];
  }, [navigate, toggle, theme, logout, t, language, enElSitio, entityCode, user]);

  /* Secciones agrupadas + lista plana para el índice activo */
  const { sections, items } = useMemo(() => {
    const q = query.toLowerCase().trim();

    const matchedActions = actions
      .filter((a) => !q || a.label.toLowerCase().includes(q))
      .map((a) => ({ ...a, kind: "action" }));

    const matchedForms = forms
      .filter((f) => !q || f.title.toLowerCase().includes(q))
      .slice(0, 6)
      .map((f) => ({
        id: f._id,
        label: f.title,
        icon: FileText,
        kind: "form",
        run: () => navigate(enElSitio ? siteBuilderPath(f._id) : builderPath(language, f._id, {}, entityCode)),
      }));

    return {
      sections: [
        {
          key: "actions",
          title: t("actions") ?? "Acciones",
          icon: Zap,
          items: matchedActions,
        },
        {
          key: "forms",
          title: t("myForms") ?? "Mis formularios",
          icon: FolderOpen,
          items: matchedForms,
        },
      ].filter((s) => s.items.length > 0),
      items: [...matchedActions, ...matchedForms],
    };
  }, [query, actions, forms, navigate, t, language, enElSitio, entityCode]);

  /* Reset del índice activo cuando cambia la lista (y guard contra vacío) */
  useEffect(() => {
    if (items.length === 0) {
      setActive(0);
    } else if (active >= items.length) {
      setActive(0);
    }
  }, [items.length, active]);

  /* El item activo siempre visible dentro del scroll */
  useEffect(() => {
    if (!open || items.length === 0) return;
    document
      .querySelector(`[data-palette-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, open, items.length]);

  useEffect(() => {
    if (!open || items.length === 0) return;
    const onKey = (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => (a + 1) % items.length);
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => (a - 1 + items.length) % items.length);
      }
      if (e.key === "Enter" && items[active]) {
        items[active].run();
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, items, active, setOpen]);

  // Escape por capas: cierra la paleta (capa superior) sin tocar lo que haya debajo.
  useEscapeKey(open, () => setOpen(false));

  if (!open) return null;

  let flatIndex = -1;

  return createPortal(
    <div className="fixed inset-0 flex items-start justify-center p-4 pt-[12vh]" style={{ zIndex: BACKDROP_Z }}>
      <div
        className="absolute inset-0 animate-fade-in backdrop-blur-sm"
        style={{ background: "var(--overlay-bg)" }}
        onClick={() => setOpen(false)}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("search") ?? "Search"}
        className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-white/70 bg-white/90 shadow-pop outline-none backdrop-blur-2xl animate-scale-in dark:border-white/10 dark:bg-[#131722]/90"
        style={{ zIndex: MODAL_Z }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/95 to-transparent dark:via-white/20" />
        <div className="flex items-center gap-3 border-b border-slate-900/5 px-4 dark:border-white/5">
          <Search className="h-4.5 w-4.5 text-ink-muted" />
          <input
            autoFocus
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-listbox"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchForms")}
            className="h-14 w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
          />
          <kbd className="hidden rounded-md border border-slate-900/10 bg-white/70 px-1.5 py-0.5 text-[10px] font-medium text-ink-muted backdrop-blur sm:block dark:border-white/10 dark:bg-white/10">
            ESC
          </kbd>
        </div>

        <div
          id="palette-listbox"
          role="listbox"
          className="scrollbar-thin max-h-80 overflow-y-auto p-2"
        >
          {loadingForms && (
            <div className="flex flex-col gap-2 p-1" aria-hidden="true">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton-shimmer animate-shimmer h-10 rounded-xl" />
              ))}
            </div>
          )}

          {!loadingForms && items.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-ink-muted">
              {t("noResults")}
            </p>
          )}

          {!loadingForms &&
            sections.map((section) => (
              <div key={section.key} className="mb-1 last:mb-0">
                {/* Header de sección estilo cmdk */}
                <div className="flex items-center gap-1.5 px-3 pb-1 pt-2">
                  <section.icon className="h-3.5 w-3.5 text-ink-muted" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                    {section.title}
                  </span>
                </div>
                {section.items.map((item) => {
                  flatIndex += 1;
                  const i = flatIndex;
                  const isActive = active === i;
                  return (
                    <button
                      key={`${item.kind}-${item.id}`}
                      role="option"
                      aria-selected={isActive}
                      data-palette-index={i}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => {
                        item.run();
                        setOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                        isActive
                          ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200"
                          : "text-ink"
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0 opacity-80" />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.kind === "form" && (
                        <span className="text-[10px] uppercase text-ink-muted">
                          {t("form")}
                        </span>
                      )}
                      {isActive && (
                        <CornerDownLeft className="h-3.5 w-3.5 text-ink-muted" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
        </div>
      </div>
    </div>,
    document.body
  );
}