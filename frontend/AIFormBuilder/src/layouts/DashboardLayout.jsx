import React, { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  LayoutTemplate,
  Plus,
  Inbox,
  Settings,
  FolderOpen,
  X,
  Users,
  Building2,
  Link2,
  ScrollText,
  BarChart3,
  AlertTriangle,
} from "lucide-react";
import { isSuper, isCreator, isEntityAdmin, isGuest, siteHomePath } from "../lib/roles.js";
import { useRoleT } from "../lib/roleI18n.js";
import { HamburgerMenuIcon } from "../components/ui/HamburgerMenuIcon.jsx";
import { ThemeToggle } from "../components/ui/ThemeToggle.jsx";
import { motion } from "framer-motion";
import { pageTransition } from "../lib/framerMotionVariants.js";
import { cn } from "../lib/utils.js";
import { useAuth } from "../hooks/useAuth.js";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { useFocusTrap, useBodyScrollLock, useEscapeKey } from "../hooks/useOverlay.ts";
import { BACKDROP_Z, MODAL_Z } from "../components/ui/Modal.tsx";
import { Logo } from "../components/Logo.jsx";
import { IdentityMenu } from "../components/auth/IdentityMenu.jsx";
import { CommandPalette } from "../components/CommandPalette.jsx";
import { LanguageSwitcher } from "../components/ui/LanguageSwitcher.jsx";
import { NotificationBell } from "../components/notifications/NotificationBell.jsx";
import { SessionAlert } from "../components/auth/SessionAlert.jsx";
import { buildPanelPath, builderPath } from "../lib/routes.js";
import { DoorOpenIcon } from "../components/ui/CategoryBadge.jsx";

/** Error boundary para páginas del panel: evita pantalla en blanco si falla una página. */
class PanelErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[PanelErrorBoundary] Render error:", error, errorInfo);
  }

  render() {
    const { hasError, error } = this.state;

    if (hasError) {
      const language = localStorage.getItem("formly_language") || "en";
      const isSpanish = language === "es";

      return (
        <div className="flex min-h-[60vh] items-center justify-center px-4">
          <div className="text-center max-w-md">
            <AlertTriangle className="h-12 w-12 mx-auto text-danger/80" aria-hidden="true" />
            <h2 className="mt-4 text-lg font-semibold text-fg">
              {isSpanish ? "Error al cargar la página" : "Failed to load page"}
            </h2>
            <p className="mt-2 text-sm text-muted">
              {isSpanish
                ? "Ocurrió un error inesperado. Intenta recargar o contacta al administrador."
                : "An unexpected error occurred. Try reloading or contact the administrator."}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 rounded-lg bg-brand-500 text-on-brand-500 text-sm font-medium hover:bg-brand-600 hover:text-on-brand-600 transition"
            >
              {isSpanish ? "Recargar página" : "Reload page"}
            </button>
            <details className="mt-4 text-left text-xs text-muted max-h-40 overflow-auto p-2 bg-surface-2 rounded">
              <summary className="cursor-pointer mb-1 font-mono">
                {isSpanish ? "Detalles técnicos" : "Technical details"}
              </summary>
              <pre>{error?.message || error?.toString()}</pre>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/* Las páginas del menú, por su CLAVE. La URL la compone `buildPanelPath` con
   el idioma activo, para que el enlace diga `configuracion` en español y
   `settings` en inglés sin tener dos listas que mantener. */
const BASE_NAV = [
  { key: "home", label: "dashboard", icon: LayoutDashboard },
  { key: "forms", label: "myForms", icon: FolderOpen },
  { key: "insights", label: "insights", icon: BarChart3 },
  { key: "inbox", label: "inbox", icon: Inbox },
  { key: "templates", label: "templates", icon: LayoutTemplate },
  { key: "settings", label: "settings", icon: Settings },
];

/* Super_admin: gestión del sistema + públicos + sus estadísticas (nunca
   crea formularios; `insights` es el agregado de TODOS los públicos). */
const SUPER_NAV = [
  { key: "publicos", rtKey: "publicForms", icon: DoorOpenIcon },
  { key: "insights", label: "insights", icon: BarChart3 },
  { key: "inbox", label: "inbox", icon: Inbox },
  { key: "usuarios", rtKey: "users", icon: Users },
  { key: "entidades", rtKey: "entities", icon: Building2 },
  { key: "urls", rtKey: "accessUrls", icon: Link2 },
  { key: "auditoria", rtKey: "audit", icon: ScrollText },
  { key: "settings", label: "settings", icon: Settings },
];

/** entity_admin: su superficie, siempre scopeada a su entidad. */
const ENTITY_NAV = [
  { key: "forms", rtKey: "entityForms", icon: FolderOpen },
  { key: "usuarios", rtKey: "users", icon: Users },
  { key: "insights", rtKey: "entityStats", icon: BarChart3 },
  { key: "inbox", label: "inbox", icon: Inbox },
];

/** Menú según rol. Sin sesión o invitado: vacío (la raíz es la puerta de
 * acceso requerido, sin navegación pública). */
function navFor(user) {
  if (!user || isGuest(user)) return GUEST_NAV;
  if (isSuper(user)) return SUPER_NAV;
  if (isEntityAdmin(user)) return ENTITY_NAV;
  if (isCreator(user)) return BASE_NAV.filter((i) => i.key !== "insights" && i.key !== "inbox" && i.key !== "settings");
  return BASE_NAV;
}

/**
 * Dirección de una entrada del menú. Los usuarios de entidad (entity_admin y
 * form_creator) navegan su panel scopeado al slug (`/panel-gestion/<slug>/...`):
 * todas sus páginas cuelgan de su slug, así que hay que añadirlo a cada enlace.
 * El super_admin/legacy no tienen entidad: sus enlaces siguen siendo globales.
 * Las entradas con `to` fijo (invitado) no pasan por aquí.
 */
function navTarget(user, item, language) {
  const entitySlug = user?.entity?.code;
  return buildPanelPath(item.panelKey || item.key, language, {}, "", entitySlug);
}

/**
 * Sin sesión no hay navegación: la raíz es la puerta de acceso requerido.
 * (Se conserva el nombre para no tocar `navFor`.)
 */
const GUEST_NAV = [];

/* 🔹 Botón-icono estándar del header */
const iconButton =
  "grid h-11 w-11 place-items-center rounded-2xl border border-transparent glass transform-gpu " +
  "text-ink-muted transition-all hover:scale-105 active:scale-95 " +
  "hover:border-brand-300 hover:text-ink hover:shadow-card";

/** Rail row: icono siempre visible, etiqueta al expandir, indicador de activo. */
function RailItem({ to, label, icon: Icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "group/rail relative mx-3 flex h-11 items-center gap-3 rounded-[20px] px-2 transition-all duration-200 ease-out hover:translate-x-0.5 hover:bg-surface-2 animated-underline",
          /* Indicador lateral de página activa */
          isActive &&
            "before:absolute before:-left-3 before:top-1/2 before:h-6 before:w-1 " +
              "before:-translate-y-1/2 before:rounded-r-full before:bg-brand-500"
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              "grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-all",
              isActive
                ? "bg-brand-gradient text-on-brand-gradient shadow-soft"
                : "text-ink-muted group-hover/rail:text-ink"
            )}
          >
            <Icon className="h-5 w-5" strokeWidth={1.8} />
          </span>
          <span
            className={cn(
              "whitespace-nowrap text-sm font-medium opacity-0 transition-opacity duration-200 group-hover:opacity-100",
              isActive ? "text-ink" : "text-ink-muted"
            )}
          >
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
}

/**
 * Drawer móvil accesible:
 *  - Cierra con Escape, click en el overlay o al navegar.
 *  - Bloquea el scroll del body mientras está abierto.
 *  - role="dialog" + aria-modal para lectores de pantalla.
 */
function MobileDrawer({ open, onClose, onCreate }) {
  const { t, language } = useLanguage();
  const rt = useRoleT();
  const { user, isAuthenticated } = useAuth();
  const panelRef = useRef(null);

  // Primitivas compartidas con <Modal/> y <Drawer/>: Escape, foco atrapado
  // y scroll del body bloqueado con contador (no pisa otros overlays).
  useFocusTrap(panelRef, open);
  useBodyScrollLock(open);
  useEscapeKey(open, () => onClose());

  if (!open) return null;

  return (
    <div className="fixed inset-0 lg:hidden" style={{ zIndex: BACKDROP_Z }}>
      <div
        className="absolute inset-0 animate-fade-in backdrop-blur-sm"
        style={{ background: "var(--overlay-bg)" }}
        onClick={onClose}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("menu")}
        tabIndex={-1}
        className="drawer-shell drawer-shell--left relative flex h-full w-[min(84vw,16rem)] animate-slide-in-left flex-col p-4 outline-none"
        style={{ zIndex: MODAL_Z }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/95 to-transparent dark:via-white/20" />
        <div className="flex items-center justify-between">
          <Logo />
          <button
            className="grid h-9 w-9 place-items-center rounded-full border border-white/70 bg-white/70 text-ink-muted shadow-sm backdrop-blur-md transition hover:scale-105 hover:text-ink active:scale-95 dark:border-white/15 dark:bg-white/10"
            onClick={onClose}
            aria-label={t("close")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {isAuthenticated && !isGuest(user) && !isSuper(user) && !isEntityAdmin(user) && <button
          onClick={() => { onClose(); onCreate?.(); }}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-gradient py-2.5 text-sm font-medium text-on-brand-gradient cta-glass-shadow transition hover:scale-105 active:scale-95 transform-gpu"
        >
          <Plus className="h-4 w-4" /> {t("newForm")}
        </button>}
        <nav className="mt-5 flex flex-col gap-1">
          {navFor(user).map((item) => (
            <NavLink
              key={item.key}
              to={item.to || navTarget(user, item, language)}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-[20px] px-3 py-2.5 text-sm font-medium transition-colors animated-underline",
                  isActive
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200"
                    : "text-ink-muted hover:bg-surface-2 hover:text-ink"
                )
              }
            >
              <item.icon className="h-4.5 w-4.5" /> {item.rtKey ? rt(item.rtKey) : t(item.label)}
            </NavLink>
          ))}
        </nav>
      </aside>
    </div>
  );
}

export function DashboardLayout({ children }) {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { t, language } = useLanguage();
  const rt = useRoleT();
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  const closeMobileNav = useCallback(() => setMobileNav(false), []);

  /* Sin área pública no hay creación anónima: sin sesión (o con una vieja
     sesión de invitado) se vuelve a la puerta de acceso requerido. Las
     cuentas reales abren el constructor de su panel. */
  const goCreate = useCallback(() => {
    if (!isAuthenticated || isGuest(user)) {
      navigate("/");
      return;
    }
    /* El form_creator abre el constructor bajo su slug de entidad (igual que
       el resto de su panel); el resto de cuentas, en la ruta global. */
    navigate(builderPath(language, "new", {}, user?.entity?.code));
  }, [isAuthenticated, user, navigate, language]);

  /* La marca vuelve AL SITIO, no al panel: sin sesión la portada es `/`, y lo
     mismo vale para el invitado, que está autenticado con su sesión anónima. */
  const goHome = useCallback(() => {
    navigate(siteHomePath(user, language));
  }, [user, navigate, language]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const profileMenu = <IdentityMenu user={user} />;

  return (
    <div className="flex min-h-screen bg-app">
      {/* Desktop rail (hover to expand) */}
      <div className="hidden w-20 shrink-0 lg:block" aria-hidden />
      <aside className="group fixed left-0 top-0 z-40 hidden h-screen w-20 flex-col overflow-hidden border-r border-transparent glass py-5 transition-[width] duration-200 ease-out hover:w-64 hover:shadow-pop lg:flex">
        <button
          onClick={goHome}
          className="mx-3 flex h-10 items-center gap-3 rounded-lg px-2"
          aria-label={t("home")}
        >
          <span className="shrink-0">
            <Logo showText={false} size={36} />
          </span>
          <span className="whitespace-nowrap text-lg font-bold tracking-tight text-ink opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            {t("appName")}
          </span>
        </button>

        <button
          onClick={goCreate}
          className="mx-3 mt-6 flex h-11 items-center gap-3 rounded-lg px-2 glass cta-glass-shadow transition-colors"
          style={!isAuthenticated || isGuest(user) || isSuper(user) || isEntityAdmin(user) ? { display: "none" } : undefined}
          aria-hidden={!isAuthenticated || isGuest(user) || isSuper(user) || isEntityAdmin(user)}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-gradient text-on-brand-gradient transition hover:scale-105 active:scale-95 transform-gpu">
            <Plus className="h-5 w-5" />
          </span>
          <span className="whitespace-nowrap text-sm font-semibold text-ink opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            {t("newForm")}
          </span>
        </button>

        <nav className="mt-4 flex flex-col gap-1">
          {navFor(user).map((item) => (
            <RailItem key={item.key} to={item.to || navTarget(user, item, language)} label={item.rtKey ? rt(item.rtKey) : t(item.label)} icon={item.icon} />
          ))}
        </nav>

        <ThemeToggle
          showLabel
          className="mx-3 mt-auto flex h-11 items-center gap-3 rounded-lg px-2 transition-colors hover:scale-105 active:scale-95 transform-gpu"
          iconWrapClassName="grid h-9 w-9 shrink-0 place-items-center text-ink-muted"
          iconClassName="h-5 w-5"
          labelClassName="whitespace-nowrap text-sm font-medium text-ink-muted opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        />
      </aside>

      <MobileDrawer open={mobileNav} onClose={closeMobileNav} onCreate={goCreate} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header sticky con efecto glass */}
        <motion.header
          variants={pageTransition}
          initial="initial"
          animate="animate"
          exit="exit"
          className="glass sticky top-0 z-30 flex min-h-[4.5rem] flex-wrap items-center gap-x-3 gap-y-2 border-b border-line/60 px-2.5 py-2.5 sm:px-4 lg:px-8">
          <button
            className="rounded-xl p-2 text-ink-muted transition-colors hover:bg-surface-2 lg:hidden"
            onClick={() => setMobileNav(true)}
            aria-label={t("menu")}
          >
            <HamburgerMenuIcon isOpen={mobileNav} />
          </button>

          <div className="ml-auto flex flex-wrap items-center justify-end gap-x-2 gap-y-2 sm:flex-nowrap">
            {/* Sin buscador visible en el header: la paleta general se abre
                con ⌘K/Ctrl+K (listener global de este layout). */}
            <NotificationBell />

            <ThemeToggle className={iconButton} iconClassName="h-[18px] w-[18px]" />

            <LanguageSwitcher />
            {/* Mientras la sesión se restaura no se pinta NADA: si no, la
                insignia de invitado saldría por delante del menú de una
                cuenta real justo antes de que esta llegue. */}
            {!authLoading && isAuthenticated && !isGuest(user) ? profileMenu : null}
          </div>
        </motion.header>

        {/* animate-page-enter: las rutas "entran" con un slide-up suave */}
        <motion.main
          variants={pageTransition}
          initial="initial"
          animate="animate"
          exit="exit"
          className="flex-1"
        >
          <div>
            <PanelErrorBoundary>{children ?? <Outlet />}</PanelErrorBoundary>
          </div>
        </motion.main>
      </div>

      <CommandPalette open={paletteOpen} setOpen={setPaletteOpen} />
      <SessionAlert />
    </div>
  );
}