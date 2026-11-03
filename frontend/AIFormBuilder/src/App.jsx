import { lazy, Suspense, useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation, useParams, useSearchParams } from "react-router-dom";
import { ProtectedRoute } from "./layouts/ProtectedRoute.jsx";
import { DashboardLayout } from "./layouts/DashboardLayout.jsx";
import { PageLoader } from "./components/ui/Feedback.jsx";
import { DateTimePicker } from './components/ui/DateTimePicker.jsx';
import LoginPage from "./pages/LoginPage";
import PublishedForms from "./pages/PublishedForms.jsx";
import AccessLogin from "./pages/AccessLogin";
import LocalLogin from "./pages/LocalLogin";
import Activar from "./pages/Activar";

import Dashboard from "./pages/Dashboard.jsx";
import NotFound from "./pages/NotFound.jsx";
import { useLanguage } from "./contexts/LanguageContext.jsx";
import { useAuth } from "./hooks/useAuth.js";
import { ADMIN_PAGES, canSeeAdminPage, canSeeEntityAdminPage, canSeeStatsPage, isCreator, isEntityAdmin, isGuest } from "./lib/roles.js";
import { applyDocumentTitle } from "./lib/pageTitle.js";
import { PreferencesSync } from "./components/settings/PreferencesSync.jsx";
import { LocaleSync } from "./components/LocaleSync.jsx";
import {
  A_PANTALLA_COMPLETA,
  ACTIVATION_PATH,
  EN_EL_ARMazon,
  LANGUAGES,
  LEGACY,
  ROUTES,
  buildPanelPath,
  canonicalPanelPath,
  homePath,
  legacyPanelPath,
  panelBase,
  siteBuilderPath,
  SUPER_ADMIN_LOGIN_PATH,
} from "./lib/routes.js";

// Heavier routes (builder, charts, public renderer) are code-split.
const Templates = lazy(() => import("./pages/Templates.jsx"));
const Builder = lazy(() => import("./pages/Builder.jsx"));
const Responses = lazy(() => import("./pages/Responses.jsx"));
const Analytics = lazy(() => import("./pages/Analytics.jsx"));
const PublicForm = lazy(() => import("./pages/PublicForm.jsx"));
const Trash = lazy(() => import("./pages/Trash.jsx"));

const Insights = lazy(() => import("./pages/Insights.jsx"));
const Inbox = lazy(() => import("./pages/Inbox.jsx"));
const Settings = lazy(() => import("./pages/Settings.jsx"));
const Profile = lazy(() => import("./pages/Profile.jsx"));
const Security = lazy(() => import("./pages/Security.jsx"));
const Notifications = lazy(() => import("./pages/Notifications.jsx"));
const Help = lazy(() => import("./pages/Help.jsx"));
const Shortcuts = lazy(() => import("./pages/Shortcuts.jsx"));
const MyForms = lazy(() => import("./pages/MyForms.jsx"));
const DesignShowcase = lazy(() => import("./pages/DesignShowcase.jsx"));
const AdminUsers = lazy(() => import("./pages/admin/Users.jsx"));
const AdminEntities = lazy(() => import("./pages/admin/Entities.jsx"));
const AdminUrls = lazy(() => import("./pages/admin/AccessUrls.jsx"));
const AdminAudit = lazy(() => import("./pages/admin/Audit.jsx"));
const AdminPublics = lazy(() => import("./pages/admin/PublicStats.jsx"));
const EntityForms = lazy(() => import("./pages/entity-admin/EntityForms.jsx"));
const ForcePasswordChange = lazy(() => import("./pages/ForcePasswordChange.jsx"));
const EntityUsers = lazy(() => import("./pages/entity-admin/EntityUsers.jsx"));
const EntityStats = lazy(() => import("./pages/entity-admin/EntityStats.jsx"));

export const FormCard = () => {
  const [selectedDateTime, setSelectedDateTime] = useState(new Date());

  return (
    <div style={{ padding: '20px' }}>
      <DateTimePicker 
        label="Fecha de Cierre del Formulario" 
        value={selectedDateTime} 
        onChange={(newDate) => setSelectedDateTime(newDate)}
      />
    </div>
  );
};

function Lazy({ children }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

/* `forms` y `usuarios` son las dos claves que el entity_admin comparte con el
   super_admin: la MISMA URL (`/panel-gestion/<slug>/formularios`) sirve al
   gestor de la entidad y al dueño de su panel. El componente ramifica por rol
   para no duplicar la entrada de rutas. */
function FormsPage() {
  const { user } = useAuth();
  return isEntityAdmin(user) ? <EntityForms /> : <MyForms />;
}

function UsersPage() {
  const { user } = useAuth();
  return isEntityAdmin(user) ? <EntityUsers /> : <AdminUsers />;
}

/* `insights` es la página «Estadísticas»: el super_admin ve su agregado de
   públicos; el entity_admin, el agregado de TODOS los formularios de SU
   entidad (misma URL `/panel-gestion/<slug>/estadisticas`). */
function StatsPage() {
  const { user } = useAuth();
  return isEntityAdmin(user) ? <EntityStats /> : <Insights />;
}

/* Cada página del panel, con su elemento. El segmento NO está aquí: vive en
   `ROUTES` (src/lib/routes.js), traducido al idioma que se monte abajo, para que
   la tabla de rutas y la de la URL no puedan contradecirse. */
const PAGINAS = {
  home: <Dashboard />,
  forms: <Lazy><FormsPage /></Lazy>,
  responses: <Lazy><Responses /></Lazy>,
  analytics: <Lazy><Analytics /></Lazy>,
  insights: <Lazy><StatsPage /></Lazy>,
  inbox: <Lazy><Inbox /></Lazy>,
  settings: <Lazy><Settings /></Lazy>,
  profile: <Lazy><Profile /></Lazy>,
  security: <Lazy><Security /></Lazy>,
  notifications: <Lazy><Notifications /></Lazy>,
  help: <Lazy><Help /></Lazy>,
  shortcuts: <Lazy><Shortcuts /></Lazy>,
  templates: <Lazy><Templates /></Lazy>,
  trash: <Lazy><Trash /></Lazy>,
  design: <Lazy><DesignShowcase /></Lazy>,
  builder: <Lazy><Builder /></Lazy>,
  usuarios: <Lazy><UsersPage /></Lazy>,
  entidades: <Lazy><AdminEntities /></Lazy>,
  urls: <Lazy><AdminUrls /></Lazy>,
  auditoria: <Lazy><AdminAudit /></Lazy>,
  publicos: <Lazy><AdminPublics /></Lazy>,
};

/**
 * Guardia por rol dentro del panel (detrás de ProtectedRoute).
 * - Páginas de gestión: solo super_admin.
 * - Páginas de estadísticas: vetadas a form_creator. El super_admin abre el
 *   agregado general y la analítica de UN formulario público (su superficie
 *   es el panel de públicos), pero no las respuestas en bruto ni la bandeja.
 *   Legacy pasa (compatibilidad).
 * - Rutas con entitySlug: valida que el usuario pertenezca a esa entidad.
 */
function RoleRoute({ pageKey, children }) {
  const { user, loading } = useAuth();
  const { language } = useLanguage();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const entitySlug = params.entitySlug;
  if (loading) return <PageLoader />;
  /* El invitado NO tiene panel. Cualquier dirección del panel que le llegue
     (un enlace viejo, una escritura a mano) lo devuelve al SITIO, y si es el
     constructor, al constructor DEL SITIO, que es el mismo editor con otra
     dirección. Así ninguna URL de invitado vive bajo `/panel-gestion`. */
  if (!user || isGuest(user)) {
    const destino =
      pageKey === "builder" && params.id
        ? siteBuilderPath(params.id, { ai: searchParams.get("ai") === "1" })
        : "/";
    return <Navigate to={destino} replace />;
  }
  /* Contraseña temporal pendiente de cambio (variante B del alta): cualquier
     URL del panel queda interceptada por la pantalla de cambio forzado hasta
     que el usuario fije una contraseña propia. */
  if (user.mustChangePassword) {
    return (
      <Lazy>
        <ForcePasswordChange />
      </Lazy>
    );
  }
  // El inicio del super_admin es su panel de públicos, no el dashboard.
  if (pageKey === "home" && user?.role === "super_admin") {
    return <Navigate to={buildPanelPath("publicos", language)} replace />;
  }
  // El entity_admin no tiene dashboard: su portada son los formularios de su
  // entidad (mismo panel, scopeado a su slug).
  if (pageKey === "home" && isEntityAdmin(user)) {
    return <Navigate to={buildPanelPath("forms", language, {}, "", entitySlug || user?.entity?.code)} replace />;
  }
  // Si la ruta tiene entitySlug, valida que el usuario pertenezca a esa entidad
  if (entitySlug) {
    const userEntityCode = user?.entity?.code;
    if (userEntityCode !== entitySlug) {
      // Usuario intenta acceder a entidad ajena → redirige a su entidad
      return <Navigate to={homePath(language, userEntityCode)} replace />;
    }
  } else if (user?.role !== "super_admin" && user?.entity?.code) {
    // Usuario de entidad en ruta global → redirige a su entidad
    return <Navigate to={homePath(language, user.entity.code)} replace />;
  }
  if (!canSeeEntityAdminPage(user, pageKey)) {
    return <Navigate to={buildPanelPath("forms", language, {}, "", entitySlug || user?.entity?.code)} replace />;
  }
  // Gestor de entidad y gestor de formularios: sin página de configuración
  // (ni Apariencia). El super_admin la conserva intacta.
  if ((isEntityAdmin(user) || isCreator(user)) && pageKey === "settings") {
    return <Navigate to={buildPanelPath("forms", language, {}, "", entitySlug || user?.entity?.code)} replace />;
  }
  if (ADMIN_PAGES.includes(pageKey) && !canSeeAdminPage(user, pageKey)) {
    return <Navigate to={homePath(language, entitySlug)} replace />;
  }
  if (!canSeeStatsPage(user, pageKey)) {
    return <Navigate to={homePath(language, entitySlug)} replace />;
  }
  return children;
}

/**
 * Un idioma = un alias + sus segmentos. Es una FUNCION y no un componente a
 * propósito: `<Routes>` inspecciona el tipo de sus hijos antes de montarlos y
 * solo admite `<Route>` o `<Fragment>`, así que un `<PanelRoutes language="es" />`
 * dentro del árbol de rutas revienta la app entera. Llamarla devuelve `<Route>`
 * de verdad.
 */
function rutasDelPanel(language) {
  const alias = panelBase(language).replace(/^\//, "");
  /* Los segmentos van traducidos: la tabla decide, no esta función. */
  const segmentos = (keys) => keys.map((key) => [key, ROUTES.find((route) => route.key === key)[language]]);

  return (
    <>
      {/* Rutas SIN entidad: super_admin, legacy, invitado → /panel-gestion/... */}
      <Route key={`${language}-global`} path={alias}>
        <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          {segmentos(EN_EL_ARMazon).map(([key, path]) => (
            <Route key={key} path={path} element={<RoleRoute pageKey={key}>{PAGINAS[key]}</RoleRoute>} />
          ))}
          <Route path="*" element={<RutaDelPanel />} />
        </Route>
        {segmentos(A_PANTALLA_COMPLETA).map(([key, path]) => (
          <Route key={key} path={path} element={<ProtectedRoute><RoleRoute pageKey={key}>{PAGINAS[key]}</RoleRoute></ProtectedRoute>} />
        ))}
      </Route>

      {/* Rutas CON entidad: entity_admin, form_creator → /panel-gestion/:entitySlug/... */}
      <Route key={`${language}-entity`} path={`${alias}/:entitySlug`}>
        <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          {segmentos(EN_EL_ARMazon).map(([key, path]) => (
            <Route key={`${key}-entity`} path={path} element={<RoleRoute pageKey={key}>{PAGINAS[key]}</RoleRoute>} />
          ))}
          <Route path="*" element={<RutaDelPanel />} />
        </Route>
        {segmentos(A_PANTALLA_COMPLETA).map(([key, path]) => (
          <Route key={`${key}-entity-full`} path={path} element={<ProtectedRoute><RoleRoute pageKey={key}>{PAGINAS[key]}</RoleRoute></ProtectedRoute>} />
        ))}
      </Route>
    </>
  );
}

/**
 * Cualquier URL del panel que no sea la de este idioma se corrige sola: un
 * segmento en inglés debajo del alias español, o al revés. Es la misma decisión
 * que toma `LocaleSync` al cambiar de idioma, hecha en el enrutado para que
 * además funcione en la primera carga directa de un enlace.
 * Si no hay nada que corregir, es una página que no existe.
 */
function RutaDelPanel() {
  const { language } = useLanguage();

  /* Igual que `LocaleSync`: la dirección de verdad es `window.location`. Aquí se
     lee durante el render, y en un render el enrutado puede ir por detrás de
     la barra de direcciones. */
  const destino = canonicalPanelPath(window.location.pathname + window.location.search, language);
  if (destino) return <Navigate to={destino} replace />;
  return <NotFound />;
}

/**
 * Una ruta anterior al panel (la raíz, `/forms`, `/builder/42`, …) salta a su
 * equivalente bajo el alias del idioma actual, sin pasar por la pantalla de "no
 * encontrada". Los enlaces que ya se compartieron siguen llegando a la misma
 * página; lo que cambia es la dirección.
 */
function RutaVieja() {
  const { language } = useLanguage();
  const location = useLocation();
  const vieja = legacyPanelPath(location.pathname + location.search, language);

  if (!vieja) return <DashboardLayout><NotFound /></DashboardLayout>;
  return <Navigate to={vieja.path} replace />;
}

function DocumentTitle() {
  const { pathname } = useLocation();
  const { t } = useLanguage();
  const { transition } = useAuth();

  /* Las cuatro dependencias son exactamente las cuatro entradas que cambian el
     título: la ruta, el idioma (a través de `t`), y las dos mitades de la fase
     del traspaso con el IDP.

     Que `t` salga de `useCallback` en `LanguageContext` es lo que hace que esta
     lista sea utilizable. Antes `t` era una flecha nueva en cada render, así
     que la dependencia cambiaba siempre y este efecto se ejecutaba en cada
     render de la aplicación: al cerrar sesión se disparaba dos veces, una con
     cada render de `logout()` (el del overlay del IDP y el de limpiar `user`),
     reescribiendo `document.title` con el mismo texto. Con `t` estable, esto
     corre una vez por cambio real y ni una más. */
  useEffect(() => {
    // El título refleja siempre la página de destino, incluso durante el
    // traspaso con el IDP (overlay de login/logout y callback).
    applyDocumentTitle({
      pathname,
      t,
      authPhase: transition.active
        ? transition.type
        : pathname.startsWith("/auth/")
          ? "callback"
          : null,
    });
  }, [pathname, t, transition.active, transition.type]);

  return null;
}

export default function App() {
  return (
    <>
      <PreferencesSync />
      <LocaleSync />
      <DocumentTitle />
      <Routes>
      {/* Puertas del proveedor de identidad: fuera del panel y en la raíz,
          porque es el IDP quien las llama con una URL que tiene registrada
          (OIDC_LOGIN_REDIRECT_URI). Desde aquí se salta al panel. */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<LoginPage />} />

      {/* Raíz: portada pública con las encuestas publicadas (buscador, sin
          filtros ni sesión); con sesión de panel redirige a su panel. */}
      <Route path="/" element={<DashboardLayout><PublishedForms /></DashboardLayout>} />



      {/* Activación de cuenta: ruta estable (ver `ACTIVATION_PATH` en
          `lib/routes.js`). El enlace del correo apunta aquí y no al slug de la
          puerta, para que rotar una puerta no mate los correos ya enviados. */}
      <Route path={ACTIVATION_PATH} element={<Activar />} />

      {/* Puerta de administración por entidad y rol (login local). */}
      <Route path="/a/:slug" element={<AccessLogin />} />

      {/* Portal oculto del super_admin: URL fija (fuente única en
          `lib/routes.js`), nombre del sitio en español + loginadmin. */}
      <Route path={SUPER_ADMIN_LOGIN_PATH} element={<LocalLogin />} />

      {/* Respuesta pública: sin sesión. Lo privado pide identidad IDP
          dentro de la propia página (portón ?return=), no en el guard. */}
      <Route
        path="/f/:slug"
        element={
          <Lazy>
            <PublicForm />
          </Lazy>
        }
      />

      {/* El panel, una vez por idioma, con su alias y sus segmentos */}
      {LANGUAGES.map((language) => rutasDelPanel(language))}

      {/* Rutas anteriores: migran al alias del idioma actual */}
      {LEGACY.map((entrada) => (
        <Route key={entrada.ruta} path={entrada.ruta} element={<RutaVieja />} />
      ))}

      {/* 404 del sitio: con el mismo armazón que el resto de páginas. */}
      <Route path="*" element={<DashboardLayout><NotFound /></DashboardLayout>} />
      </Routes>
    </>
  );
}
