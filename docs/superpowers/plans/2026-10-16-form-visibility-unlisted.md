# Plan — Visibilidad «Solo por enlace» (unlisted) en el Builder

Fecha: 2026-10-16 · Estado: **PENDIENTE DE CONFIRMACIÓN** (no se ha tocado código)

## 1. Estado actual (verificado contra el árbol real)

### 1.1 Hallazgos que corrigen supuestos previos

| Supuesto | Realidad verificada |
|---|---|
| `utils/visibility.js` decide si un formulario es público | **No.** Es visibilidad **condicional de campos** (`visibleIf`, `CONDITIONAL_OPERATORS`). No tiene relación con la publicación. |
| Hay que crear la columna `forms.visibility` | **Ya existe**: `schema.sql:215` y `config/db.js:308` → `visibility text NOT NULL DEFAULT 'public'`. |
| `GuestHome.jsx` / `GuestStats.jsx` son el sitio público | **No existen.** El escaparate es `pages/PublishedForms.jsx` en `/` → `FormsBrowser` con `guestMode`/`publishedOnly`. |
| `listPublicFormsScoped` alimenta el sitio público | **Alimenta el panel del super_admin** (`admin.controller.listPublicAdmin`). El escaparate usa `listPublishedForGuests`. |
| Falta endpoint de visibilidad | El Builder **ya persiste** `visibility` vía el autosave (`PUT /forms/:id`, `Builder.jsx:169`). |

### 1.2 Modelo actual de `forms.visibility` (texto, sin CHECK)

| Valor | En el escaparate (`/`) | Enlace `/f/<slug>` | Respuestas | Estadísticas | Requiere entidad |
|---|---|---|---|---|---|
| `public` | Listado con badge «Público» | Abre anónimo | Anónimas | Visibles a invitado y super_admin | No |
| `private` | **También listado** (badge «Privado» + «Requiere IDP») | `requiresAuth: true`, sin preguntas | Exigido IDP | Vetadas a invitado/super_admin | **Sí** |

Detalles clave verificados:
- `findPublishedBySlug` filtra **solo por `status`**, no por `visibility` → el enlace ya sirve privados (con portón).
- `listPublishedForGuests` **no excluye** `private` por defecto: el escaparate muestra públicos **y** privados (decisión documentada en el comentario del repo).
- `response.service.js:22` bloquea respuestas solo cuando `visibility === "private"`.
- `insights.service.js:17,35,161` filtra `!== "private"` **después** de traer todo → si se excluye `unlisted` en SQL, se romperían sus métricas.
- `entity.repo.js:86` (`countPublishedByEntity`) cuenta solo `visibility = 'public'`.
- `admin.controller.js:373-377` (`publicAggregate`) acepta filtro exacto `public`/`private`.
- Auditoría disponible: `auditNow(req, action, details)` en `middleware/rbac.js` (acción libre, `entityType`/`entityId`/`details`).
- Ya existe UI de visibilidad en `SettingsPanel.jsx:215-256` (2 botones, `canManageVisibility` = `!enElSitio && isCreator(user)`).
- Badges: `CategoryBadge.jsx` (binario `public`/`private`, tokens `--color-public*`/`--color-private*` en `index.css:1788-1810`).

## 2. Modelo propuesto

Ampliar el **mismo** campo a tres valores (modelo YouTube), sin columna nueva:

| Valor | Escaparate `/` y buscadores | Enlace `/f/<slug>` | Respuestas | En paneles admin | Entidad |
|---|---|---|---|---|---|
| `public` | Sí | Anónimo | Anónimas | Sí | No |
| **`unlisted`** (nuevo) | **No** | **Anónimo** | **Anónimas** | **Sí** | **No** |
| `private` | Sí (badge «Requiere IDP») | Portón IDP | IDP obligatoria | Sí | Sí |

**No hace falta migración de esquema**: la columna es `text` sin `CHECK`, así que `unlisted` es válido de inmediato. Solo se actualiza el comentario en `schema.sql:215`.

### 2.1 Puntos de decisión (a confirmar)

1. **¿`unlisted` visible en los paneles del super_admin y del gestor de entidad?**
   → **Recomendación: SÍ.** Son superficies de gestión, no el sitio público. Ocultar un formulario a su propio administrador rompería «reversible en cualquier momento». Solo se excluye del escaparate de invitados.
2. **¿`unlisted` exige entidad como `private`?**
   → **Recomendación: NO.** Es anónimo igual que `public`; la exigencia de entidad de `private` existe porque el portón IDP es intra-org.
3. **¿Nota en el ShareModal cuando el formulario es unlisted?**
   → **Recomendación: SÍ**, una línea breve («Solo es accesible por enlace»), reforzando que el enlace directo es el canal.

## 3. Cambios por archivo

### 3.1 Backend

**`repositories/form.repo.js`**
- `listPublishedForGuests`: nuevo parámetro `listedOnly = false`; cuando es `true` añade `AND f.visibility <> 'unlisted'`. Se parametriza a propósito porque **también lo llama `insights.service`**, que sí debe seguir viendo los unlisted.
- `listPublicFormsScoped`, `listFormsScoped`, `listFormsByEntity`: aceptar `visibility === "unlisted"` en el filtro (para los paneles admin).
- `createForm`: normalizar a `["public","unlisted","private"]` (hoy solo acepta `private`/`public`).

**`services/form.service.js`**
- `createForm`: `visibility = ["private","unlisted"].includes(payload.visibility) ? payload.visibility : "public"`; la exigencia de entidad se mantiene **solo para `private`**.
- `updateForm`: misma normalización en `patch.visibility` (entidad solo para `private`).
- Nueva `setVisibility(formId, actorOrId, visibility)`: usa `getWritableForm` (autoriza creador + entity_admin de la entidad), normaliza y persiste. Devuelve `{ from, to, form }`.

**`controllers/form.controller.js`** *(esperar confirmación)*
- `guestListForms`: pasar `listedOnly: true` (el escaparate excluye unlisted).
- Nuevo `setVisibility` handler: llama al servicio y emite
  `await auditNow(req, "form.visibility.changed", { entityType: "form", entityId: form._id, from, to })`.

**`routes/form.routes.js`** *(esperar confirmación)*
- `router.patch("/:id/visibility", setVisibility)` bajo `protect` (RBAC ya vive en el servicio).

**`controllers/admin.controller.js`**
- `publicSummary`/`publicAggregate`: aceptar `visibility === "unlisted"` en el filtro; contar `publicForms` como `!== "private"` (los unlisted cuentan como publicados).

**`repositories/entity.repo.js:86`**
- `countPublishedByEntity`: `visibility = 'public'` → `visibility <> 'private'` (hoy equivalente; hace future-proof).

**Sin cambios**: `response.service.js` (unlisted ≠ private → anónimo permitido), `getGuestFormDetail` (unlisted → `requiresAuth: false`), `findPublishedBySlug` (el enlace sigue sirviendo), `analytics.service.js`, `insights.service.js`.

### 3.2 Frontend

**`components/builder/SettingsPanel.jsx`**
- El grupo `role="group"` pasa de 2 a 3 columnas: Público (DoorOpen) / **Solo por enlace** (Link2) / Privado (Lock). Nueva prop `onVisibilityChange(value)` (sustituye al patch genérico para este control).

**`pages/Builder.jsx`**
- `changeVisibility(next)`: actualización optimista del estado + `formApi.setVisibility(id, next)` + toast; revierte y recarga en error.
- **Quitar `visibility` del payload del autosave** (`:169`) → la escritura queda en un solo camino auditable.

**`services/index.js` + `index.d.ts`**
- `formApi.setVisibility(id, visibility)` → `PATCH /forms/:id/visibility`.

**`components/ui/CategoryBadge.jsx`**
- Tercera variante `type === "unlisted"`: icono SVG propio tipo eslabón, clase `cat-unlisted`, etiqueta/tip nuevos.

**`index.css`**
- Tokens `--color-unlisted*` (familia azul-acero, no de marca, espejando la estructura de `--color-public*`/`--color-private*`) en los bloques claro y oscuro; `.cat-badge.cat-unlisted`.

**`components/forms/FormCard.jsx` / `FilteredFormsList.jsx`**
- Soporte a tres estados (badge y filtros de pestaña).

**`components/forms/FormsBrowser.jsx`**
- El escaparate (`guestMode`) **no** añade pestaña «Solo por enlace»: esos formularios no aparecen allí por diseño. Sin cambios.

**`pages/admin/PublicStats.jsx` / `pages/entity-admin/EntityForms.jsx`**
- Opción «Solo por enlace» en el `Segmented` de visibilidad + icono/contador.

**`components/builder/ShareModal.jsx`**
- Cuando `form.visibility === "unlisted"`, línea informativa junto al enlace público.

**`contexts/LanguageContext.jsx`** (es/en)
- `visibilityLinkOnly`, `visibilityLinkOnlyHint`.

**`lib/roleI18n.js`** (es/en)
- `visibilityLinkOnly`, `linkOnlyOne`, `linkOnlyTip`.

**Sin cambios**: `pages/PublicForm.jsx` (unlisted → `ready`), `hooks/useForms.js`, `pages/MyForms.jsx`.

### 3.3 Docs

- `docs/RBAC_ACCESO.md`: §2/§3 (semántica de tres valores, nuevo endpoint).
- `frontend/AIFormBuilder/AGENTS.md` §10: entrada del cambio *(esperar confirmación)*.
- `schema.sql:215`: comentario `-- public | unlisted | private`.

## 4. Sondas QA (5)

1. **Escaparate excluye unlisted**: `listPublishedForGuests({ listedOnly: true })` no devuelve filas `unlisted`; sin el flag sí (insights intacto).
2. **Enlace funciona**: `getGuestFormDetail(slug)` de un unlisted → `requiresAuth: false` y `questions.length > 0`.
3. **Respuestas aceptadas**: `submitResponse(slug, { answers })` sin `respondent` → 201 (no 401).
4. **Reversible sin perder respuestas**: `public → unlisted → public`; `response_count` idéntico en los tres estados; el formulario aparece/desaparece del escaparate.
5. **Auditoría**: tras `PATCH /:id/visibility` hay fila `form.visibility.changed` con `details.from`/`details.to`.

Sondas temporales en `backend/qa/` — creadas, ejecutadas y **borradas** (patrón del repo).

## 5. Puertas de calidad

- Backend: `node --check` de los ficheros tocados.
- Frontend: `npx tsc --noEmit` (0) · `npm run lint` (0 errores) · `npm run build` (exit 0) · `npm run qa:brand` (TODO CORRECTO) · `npm run qa:routes` (baseline 124 checks / 0 fallos).
- **Reinicio del backend requerido** (`start` = `node server.js`, sin watch).

## 6. Orden de ejecución (gates)

1. **Gate 0 — Confirmación del usuario**: modelo (`unlisted` en `visibility`), §2.1 (puntos 1-3) y autorización para tocar `form.repo.js`, `form.controller.js`, `routes/form.routes.js` y `AGENTS.md` §10.
2. Backend (repo → service → controller → routes → admin/entityRepo).
3. Sondas backend 1-5.
4. Frontend (i18n → servicios → Builder/SettingsPanel → badges/filtros → ShareModal).
5. Docs + AGENTS.md §10.
6. Puertas de calidad completas.
