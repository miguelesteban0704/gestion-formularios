# RBAC, autenticación paralela y URLs por entidad — Documentación

Rediseño del sistema de acceso del AI Form Builder: roles jerárquicos,
auth local paralela al IDP, URLs de acceso por entidad/rol y categorías de
visibilidad (público/privado/restringido). Base: `backend/` (Express +
Postgres), `frontend/AIFormBuilder`
(React + react-router).

## 1. Roles

| Rol | Panel | Formularios | Estadísticas | Gestión |
|---|---|---|---|---|
| `super_admin` (único, vía entorno) | Gestión + públicos | No crea/edita/elimina; nunca ve privados | Solo públicos (individual + agregada + export + bandeja general) | Usuarios (entity/creator), entidades, categorías, URLs, settings, auditoría |
| `entity_admin` (por URL de su entidad) | Panel completo de su entidad | CRUD total en su entidad | Completas de su entidad + export | — |
| `form_creator` (alcance de su entidad) | Sin insights/inbox/analytics | CRUD de lo propio | Ninguna | — |
| `guest` (sin sesión) | — | Ve publicados (públicos y privados; nunca `unlisted`) | — | — |
| legacy (`role` NULL) | Como antes | Lo propio + stats (compatibilidad intacta) | Como antes | — |

Categorías (`forms.visibility`): `public` (etiqueta «Público»; anónimo, sin
sesión, listado en el escaparate), `unlisted` (etiqueta «Privado»: fuera del
escaparate y de buscadores, pero `/f/<slug>` funciona y admite respuesta
anónima) y `private` (etiqueta «Restringido»: exige identidad IDP para
responder). `unlisted` y `private` nacen atados a una entidad (400 si no) y son
reversibles sin perder respuestas. Los paneles de gestión
(super_admin/entity_admin) siguen mostrando los `unlisted`.
`unlisted` y `private` comparten el icono de estado en el `CategoryBadge` (eslabón
para «Privado», candado para «Restringido»).

## 2. Autenticación

**Local (panel: los 3 roles).** `POST /api/auth/local/login`
`{identifier, password}` (+ `slug`/`ctx` opcionales cuando el login se hace
desde una puerta `/a/:slug`) → `{token, user}` (JWT + fila `user_sessions`,
igual mecanismo que el IDP). El login va **atado a la puerta**: con `slug` se
resuelve la URL de acceso activa y solo entra la cuenta cuyo **rol y entidad**
coinciden con ella (un enlace de gestor de entidad no admite a un gestor de
formularios ni al revés; auditoría `auth.local.wrong_door`); sin `slug`, el
login es el del **portal fijo del super_admin** y solo admite a `super_admin` o
a cuentas legacy sin rol (`auth.local.wrong_portal`). Bloqueo temporal por
intentos (`LOCAL_LOGIN_MAX_ATTEMPTS`/`LOCAL_LOGIN_LOCK_MINUTES`), rate-limit
60/15min, bcrypt 12 rondas. Sin enumeración (mismo error exista o no).
`POST /api/auth/local/logout` revoca el `jti` actual.
Alta: `POST /api/auth/local/register` (solo super_admin; jamás rol super_admin).
El alta exige `entityId` + `accessUrlId` (una URL de acceso **activa** de esa
entidad y ese rol): sin ella no se crea la cuenta.
Recuperación: `POST /api/auth/local/forgot` (respuesta idéntica exista o no;
el token solo se expone fuera de producción — en prod va por correo) →
`POST /api/auth/local/reset {token, password}` (un solo uso, caduca en
`PASSWORD_RESET_TTL_MINUTES`, invalida todas las sesiones).
No hay CSRF por diseño: el token viaja en header `Authorization: Bearer`
(no en cookie).

**IDP (encuestados en privados).** El invitado pulsa "Continuar con IDP":
`GET /api/auth/login?return=/f/<slug>` (allowlist estricta) → tras el
code-exchange validado por openid-client, el backend sella `?rid=` (JWT propio
6h con `sub` + nombre, sin fila de sesión) y redirige a `/f/<slug>?rid=`.
La página muestra el nombre (no editable) y lo adjunta en
`X-Idp-Respondent: Bearer <rid>` (o `?rid=`). El detalle
`GET /api/guest/forms/:slug` es consciente de esa identidad: con un `rid` válido
**para ese mismo slug** entrega el formulario completo (con preguntas); sin él,
un privado solo devuelve `requiresAuth`. Sin nombre en claims se usa
email/sub y se registra advertencia en logs. La respuesta guarda
`respondent_sub`/`respondent_name` (`is_anonymous=false`).

## 3. Endpoints nuevos

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/guest/forms?search&entityId&visibility` | — | Escaparate (metadatos); excluye `unlisted` (`listedOnly`) |
| GET | `/api/guest/forms/:slug` | `rid` opcional | Detalle; privado → `requiresAuth` sin preguntas, salvo `rid` válido del mismo slug → completo |
| POST | `/api/guest/forms/:slug/respond` | `rid` si privado | Respuesta (gate por visibilidad) |
| POST | `/api/guest/session` | — (limit) | Sesión anónima (constructor, IA, plantillas con dueño propio) |
| GET | `/api/guest/forms/:slug/stats` | — | Stats solo de públicos (privado → 404) |
| GET | `/api/guest/forms/:slug/export` | — | CSV solo de públicos |
| GET | `/api/guest/stats` | — | Agregado general público (mismo cómputo que Insights, sin privados) |
| GET | `/api/guest/entities` | — | Catálogo activo para filtros |
| POST | `/api/auth/local/register` | super_admin | Alta de entity/creator (exige `accessUrlId` de la entidad/rol) |
| POST | `/api/auth/local/login` | — (limit) | Login panel; opcional `slug`/`ctx` de la puerta `/a/:slug` (rol+entidad forzados) |
| POST | `/api/auth/local/logout` | sesión | Cierre |
| POST | `/api/auth/local/forgot` | — (limit) | Pedir recuperación |
| POST | `/api/auth/local/reset` | — (limit) | Fijar contraseña |
| GET | `/api/admin/users?search&role&entityId` | super_admin | Listar |
| PATCH/DELETE | `/api/admin/users/:id` | super_admin | Rol/entidad/estado/`accessUrlId`; protege al único super_admin y auto-borrado |
| GET/POST | `/api/admin/entities` | super_admin | + filtros search/category/active |
| PATCH/DELETE | `/api/admin/entities/:id` | super_admin | |
| GET/POST | `/api/admin/categories` | super_admin | |
| PATCH/DELETE | `/api/admin/categories/:id` | super_admin | |
| GET/POST | `/api/admin/access-urls` | super_admin | Crear (slug aleatorio + sello) |
| PATCH | `/api/admin/access-urls/:id` `{isActive}` | super_admin | Activar/desactivar |
| POST | `/api/admin/access-urls/:id/regenerate` | super_admin | Nuevo slug+sello |
| DELETE | `/api/admin/access-urls/:id` | super_admin | Eliminar |
| GET | `/api/access/:slug?ctx=` | — | Resolver contexto (entidad+rol), cuenta uso |
| GET/PUT | `/api/admin/settings` | super_admin | Configuración global (`site_settings`) |
| GET | `/api/admin/audit?action&limit&offset` | super_admin | Auditoría |
| GET | `/api/admin/public-forms?search&entityId` | super_admin | No privados (públicos + `unlisted`) + `summary` escrito |
| GET | `/api/admin/public-stats?entityId` | super_admin | Totales + por entidad + por formulario |
| GET | `/api/admin/public-forms/:id/stats` | super_admin | Analítica (veta privados) |
| GET | `/api/admin/public-forms/:id/export` | super_admin | CSV (veta privados) |
| GET | `/api/admin/entity-stats` | entity_admin | Agregado de su entidad |
| GET | `/api/entity-admin/users?search&role&from&to` | entity_admin | Gestores de SU entidad (nunca super_admin) |
| POST | `/api/entity-admin/users` | entity_admin | Alta de gestor (rol y entidad FORZADOS; exige `accessUrlId` activa de su entidad/rol) |
| PATCH/DELETE | `/api/entity-admin/users/:id` | entity_admin | Nombre / `email` / `username` / `password` / `accessUrlId` / `isActive` (unicidad de correo/usuario; cambio de credenciales o desactivación revoca sesiones); solo su entidad |
| GET | `/api/entity-admin/forms?search&status&ownerId&visibility&from&to&includeArchived` | entity_admin | Formularios de SU entidad (`entity_id` obligatorio) |
| GET | `/api/entity-admin/forms/:id/stats` | entity_admin | Analítica de un formulario (veta lo de otra entidad) |
| GET | `/api/entity-admin/access-urls` | entity_admin | URLs activas de su entidad y rol gestor (solo lectura) |
| POST | `/api/entity-admin/access-urls` | entity_admin | Genera una URL NUEVA de SU entidad + rol gestor (slug aleatorio + sello; la reutiliza el alta) |
| PATCH | `/api/forms/:id/visibility` `{visibility}` | dueño/entity_admin | Cambia la visibilidad (`public`\|`unlisted`\|`private`) en un único camino auditado (`form.visibility.changed`); exige entidad para `unlisted`/`private`; idempotente |

## 4. URLs de acceso por entidad y rol

Formato `https://<host>/a/a7f3k9-login-x2m8?ctx=<sello>`:
slug con `crypto.randomBytes` (alfabeto sin ambiguos) y sello AES-256-GCM
de `{entityId, entityCode, role, slug}` (clave `URL_SECRET` o derivada
documentada de `JWT_SECRET`). El sello incluye el slug: no trasplantable.
El resolver valida slug + sello + `is_active` y suma `use_count`/`last_used_at`.
CRUD completo + regeneración en el panel (página URLs con copiar al portapapeles).

**Correlación cuenta ↔ URL.** Toda cuenta gestionada nace vinculada a la URL que
la origina (`users.access_url_id`, FK `ON DELETE SET NULL`). La correlación es
**por rol**: un `entity_admin` usa la URL de gestor de su entidad y un
`form_creator` la de gestor. En el alta del panel se elige del desplegable de
URLs **activas** de la entidad y el rol seleccionados; si esa combinación no
tiene URL, no se puede crear (el backend valida entidad + rol + `is_active` con
`assertAccessUrlFor`). Al editar, cambiar rol o entidad exige una URL nueva
válida (o limpia el vínculo); editar solo el nombre lo conserva.

**Al iniciar sesión.** El login reutiliza esa misma correlación: una puerta
`/a/:slug` solo deja entrar a la cuenta cuyo rol y entidad coinciden con su
URL de acceso (bloqueando el cruce entidad/creador dentro de la misma entidad y
el acceso a otra entidad), y el portal fijo solo admite al `super_admin` (las
cuentas legacy sin rol siguen entrando por el portal, como antes).

## 5. Frontend

- `/` muestra el escaparate de invitados con el shell original (sidebar,
  header con tema/idioma) y redirige al panel cuando hay sesión (inicio del
  panel intacto). Menú de invitados: Todos los formularios (`/`),
  Estadísticas (`/estadisticas`, diseño idéntico a Insights con datos reales
  de publicados) y Plantillas. Las tarjetas conservan su diseño con
  `<CategoryBadge>` al extremo derecho (puerta abierta en «Público», eslabón
  en «Privado», candado en «Restringido»; SVG propios, glassmorphism,
  tooltip, tokens `--color-public`/`--color-private`/`--color-unlisted` por
  tema) y pie de invitado:
  botón Estadísticas (solo públicos, con CSV) y botón Responder (directo
  en públicos, vía IDP en privados). `/estadisticas/:slug` muestra stats
  públicas sin sesión.
- `/a/:slug` → `AccessLogin` (contexto entidad/rol + login local; el login va
  atado a la puerta: solo entra la cuenta cuyo rol y entidad coinciden con su
  URL de acceso).
- Portal oculto del super_admin: `/formularios-con-ia-loginadmin` (URL fija:
  nombre del sitio en español + marca `loginadmin`). No se enlaza desde
  ningún sitio; un slug inválido cae al 404. Al iniciar sesión por él solo
  admite el rol `super_admin` (y las cuentas legacy sin rol): un gestor de
  entidad o de formularios no puede entrar por aquí, debe usar su propia puerta
  `/a/:slug`. Se verifica contra la constante
  `LOGIN_PORTAL_SLUG` del backend en `POST /api/guest/login-portal/verify`
  y el valor también se sincroniza en `site_settings.local_login_slug`; el
  endpoint de rotación del panel reafirma la misma URL fija. La misma URL
  es la constante `SUPER_ADMIN_LOGIN_PATH` de `src/lib/routes.js`, a la que
  vuelve `AuthContext.logout()` del super_admin (revocación local, sin paso
  por el IDP, porque su sesión nunca nació allí).
- `/f/:slug` público con portón IDP y cinta de identidad.
- Panel: `RoleRoute` por página; menú por rol (super: gestión + públicos +
  estadísticas —el agregado general de todos los públicos y la analítica de
  UNO, con su menú de exportar a Excel/Word/PDF—, **bandeja de entrada general
  de los formularios públicos** (`getInbox` ramifica por rol y, para el super,
  `listPublishedForGuests` con `visibility !== 'private'`), sin botón de crear;
  creator sin insights/inbox); `EntitySelect` con búsqueda, 5 categorías y 81
  entidades; `PublicStats` escribe el resumen en la interfaz y además lo
  notifica (`toast`).
- Iconos: trazo fino global (`.lucide { stroke-width: 1.5 }`) + `strokeWidth={1.5}`
  en componentes nuevos.

### 5.1 Panel del entity_admin (Gestión de Entidad)

El `entity_admin` comparte el armazón del panel pero con su propia superficie,
**siempre scopeada a su entidad** por la URL
(`/panel-gestion/<entitySlug>/...`, donde `entitySlug = user.entity.code`). Para
no duplicar rutas, **reutiliza las claves existentes** `forms` y `usuarios`: el
componente de página ramifica por rol (`App.jsx` → `FormsPage`/`UsersPage`), de
modo que la misma URL sirve al super_admin y al gestor de la entidad.

- Menú (`DashboardLayout.jsx` → `ENTITY_NAV`): Formularios de la entidad,
  Usuarios, Estadísticas, Bandeja de entrada y Ajustes. El botón
  «nuevo formulario» se oculta (el
  entity_admin no crea formularios). El helper `navTarget` añade el slug de la
  entidad a cada enlace.
- Portada: `homePathForRole` y `RoleRoute` llevan al entity_admin a `forms`
  (no al dashboard genérico). `canSeeEntityAdminPage` veta cualquier página
  fuera de `ENTITY_PAGES = ["home","forms","usuarios","insights","analytics","inbox","settings"]`.
- Estadísticas: la página general (`insights` = `/panel-gestion/<slug>/estadisticas`)
  ramifica por rol (`App.jsx` → `StatsPage`): para el entity_admin monta
  `EntityStats.jsx`, que consume `GET /api/admin/entity-stats` (`entityAggregate`:
  públicos + privados + archivados de SU entidad) y muestra el agregado
  (formularios/respuestas/vistas + promedio) y una fila por trámite con su
  botón «Ver estadísticas» hacia la analítica de ese formulario.
- `EntityUsers.jsx` (`pages/entity-admin/`): alta/edición/baja de gestores de su
  entidad. Rol (`form_creator`) y entidad fijos: sin selectores y **sin columna
  Entidad** en la tabla (todas las filas son de la misma entidad). La URL de
  acceso no se elige de una lista: se **genera bajo demanda**
  (`POST /api/entity-admin/access-urls`) con slug aleatorio copiable; en
  edición muestra la URL asignada y permite «Regenerar». La edición admite
  correo, usuario, contraseña y URL de acceso (backend: `PATCH
  /api/entity-admin/users/:id` con unicidad de correo/usuario; cambiar
  credenciales o desactivar revoca las sesiones del gestor). Tras el alta se
  ofrece «Ir al login», que abre `/a/<slug>` en una pestaña nueva: el login
  local del gestor vive en su propia ranura de sesión, así que abrirlo **no
  cierra** la del administrador.
- `EntityForms.jsx`: listado de solo lectura de los formularios de la entidad
  con filtros de estado/visibilidad y FAB por fila (Ver, Responder —la página
  pública `/f/<slug>` en pestaña nueva—, Estadística —la analítica del
  formulario dentro del panel— y copiar enlace).
- Aislamiento: la sonda `backend/qa/_probe-entity-admin-scope.mjs` (temporal,
  eliminada) verificó el scoping de usuarios/formularios/stats/URLs, el 404 a
  recursos ajenos o de `super_admin` y el forzado de rol + entidad en el alta.

### 5.2 Panel del form_creator

El gestor comparte el armazón pero **toda su navegación va scopeada a su
entidad** por el slug, igual que el entity_admin. `RoleRoute` (`App.jsx`)
rebota a `homePathForRole` cualquier ruta global pedida por un usuario con
`user.entity.code`; por eso cualquier superficie del gestor debe construir sus
enlaces con `builderPath/settingsPath/templatesPath/responsesPath/analyticsPath`
pasando `user.entity.code` como `entitySlug`. Regla: **cualquier usuario con
`user?.entity?.code` navega scopeado**; solo `super_admin`/legacy (sin entidad)
usan rutas globales. `homePathForRole` (`roles.js`) deriva el slug de
`user.entity.code` cuando no se le pasa explícito.

- Superficies ajustadas: `DashboardLayout` (`navTarget`, «Nuevo»), `IdentityMenu`
  (Ajustes), `CommandPalette` (todas las acciones y la búsqueda), `Builder`
  (post-creación, volver, respuestas/analíticas), `MyForms`/`FormsBrowser`/
  `FormCard`, `FormPageHeader` (tabs), `Dashboard` (tarjetas), `Templates` y
  `NotificationBell`.
- Stats vetadas: `canSeeStatsPage(user, …)` devuelve `false` para el gestor en
  `responses`/`analytics`/`insights`/`inbox`. En vez de ofrecer enlaces que
  rebotarían, el Builder y `FormCard` **ocultan** esos accesos (`puedeStats`).
- El gestor conserva Visibilidad, Ajustes (Apariencia/Dispositivos) y el CRUD
  de sus propios formularios.

### 5.3 Datos del encuestado IDP (formularios privados)

Cuando alguien responde un formulario **privado**, el portón IDP entrega su
identidad y el backend la guarda con la respuesta. Campos persistidos en
`responses` (migración idempotente en `config/db.js` + `db/schema.sql`):
`respondent_sub` (identificador estable del IDP), `respondent_name`,
`respondent_email`, `respondent_username`. El token de continuación
(`rid`, `middleware/respondent.js`) transporta `sub`, `name`, `email` y
`username` (este último desde el claim `preferred_username` en
`auth.controller.js`); `response.service.js` los extrae al crear la respuesta y
`mapResponse` los expone al frontend. Las respuestas anónimas de formularios
públicos no llevan estos campos.

- En el **panel de entidad** y en la **analítica de un formulario** privado se
  muestra una sección con la identidad de cada encuestado (componente
  compartido `components/responses/RespondentCard.jsx`, deduplicado por
  `respondentSub`); la bandeja de entrada lo muestra en el detalle de cada
  respuesta y prioriza esa identidad sobre lo escrito en los campos.

## 6. Variables de entorno nuevas (todas opcionales salvo secreto JWT)

`URL_SECRET`, `SUPER_ADMIN_EMAIL` + `SUPER_ADMIN_PASSWORD` (+ `SUPER_ADMIN_NAME`),
`LOCAL_LOGIN_MAX_ATTEMPTS` (8), `LOCAL_LOGIN_LOCK_MINUTES` (15),
`PASSWORD_RESET_TTL_MINUTES` (60). Tablas y seeds corren en `migrate()`;
el catálogo (81) y el super_admin se aseguran en el arranque (`runBootstrap`,
idempotente). Registro de auditoría: logins locales, altas/cambios de
usuario, entidades, URLs, settings (best-effort, nunca rompe la petición).
