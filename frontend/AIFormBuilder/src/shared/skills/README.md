# Skills compartidos (`src/shared/skills`)

Barrel de las piezas reutilizables del proyecto. El código nuevo debe importar
desde aquí (o desde `@/shared/styles/*`) en vez de recordar rutas dispersas.

> **Estado:** capa base nueva, aún sin consumidores. Se creó para centralizar el
> inventario y no toca el runtime existente. Los módulos heredados sólo-JS
> (abajo) siguen con sus rutas originales; están listados para que sepas dónde
> vive cada skill aunque no se re-exporte aquí (el tsconfig acotado no tipa JS).

---

## 1. Lo que re-exporta `index.ts`

| Skill | Origen | Qué es | Dónde se aplica hoy |
|---|---|---|---|
| `useConfirm` | `@/hooks/useConfirm` | Confirmaciones imperativas vía `ConfirmProvider` | `pages/admin/{Users,Entities,AccessUrls}.jsx`, `DesignShowcase` |
| `useDeleteConfirm` | `@/hooks/useDeleteConfirm` | Wrapper `{ confirm, busy }` para borrados | `DesignShowcase` |
| `useDialog` | `@/hooks/useDialog` | Estado headless de diálogo (open/close/loading/error) | componentes de diálogo |
| `useModal` | `@/hooks/useModal` | Estado headless de modal (open/close/toggle/data) | — |
| `useNotification` | `@/hooks/useNotification` | Avisos reactivos (`useSyncExternalStore`) | `DesignShowcase` |
| `createStore` / `useStore` | `@/feedback/store` | Store externo genérico + hook reactivo | `feedback/*` |
| `useFocusTrap`, `useBodyScrollLock`, `useScrollLock`, `useEscapeKey` | `@/feedback/overlay` | Primitivas de overlay (foco, scroll, Esc por capas) | `DashboardLayout`, `CommandPalette`, `Modal.tsx`, `Drawer.jsx` |
| `dialogSize`, `alertTone`, `buttonVariant` | `@/feedback/variants` | Variantes CVA del feedback | `Modal.tsx`, `AlertDialog.tsx`, `Feedback.jsx` |
| `cn`, `timeAgo`, `formatDuration`, `formatDate`, `initials`, `hexToRgba`, `shade`, `downloadBlob` | `@/lib/utils` | Helpers base (clases, fechas, descargas) | ~40 archivos usan `cn`; el resto, UI puntual |
| `formatCurrency`, `formatNumber`, `formatPercent`, `slugify` | nuevos aquí | Formateo/normalización genéricos | pendiente de adopción |
| `isBlank`, `isEmail`, `isUrl`, `isStrongPassword`, `validators` | nuevos aquí | Validadores puros | pendiente de adopción |
| `http<T>` | nuevo aquí | Cliente `fetch` tipado con JSON + `HttpError` | pendiente de adopción |

### Ejemplos

```ts
import { cn, useConfirm, formatCurrency, isEmail, http } from "@/shared/skills";

const ok = isEmail("a@b.com");            // true
const precio = formatCurrency(19.9);      // "$19.90"
const datos = await http<{ id: string }>("/api/forms", { method: "GET" });
```

---

## 2. Skills heredados que NO se re-exportan (sólo-JS)

Imports directos, sin cambios. Se documentan para no perderlos.

| Skill | Ruta | Qué exporta |
|---|---|---|
| Utilidades base | `@/lib/utils.js` | `cn`, `timeAgo`, `formatDuration`, `formatDate`, `initials`, `hexToRgba`, `shade`, `downloadBlob` (ya re-exportado) |
| Acento | `@/lib/accent.js` | catálogo de acentos + `applyAccent`, `buildAccentScale`… |
| Rutas | `@/lib/routes.js` | `ROUTES`, `BUILDER`, generadores `panelPath`/`formsPath`/… |
| Roles/RBAC | `@/lib/roles.js` + `@/lib/roleI18n.js` | `ROLES`, `isSuper`, `canSeeAdminPage`, `useRoleT`… |
| Tipos de campo | `@/lib/fieldTypes.js` | `FIELD_DEFS`, `createField`, `visibleRenderList`… |
| Temas de formulario | `@/lib/themes.js` | `FORM_THEMES`, `getTheme` |
| Plantillas | `@/lib/templates.js` | `TEMPLATES`, `normalizeTemplateForm`… |
| Validación de respuestas | `@/lib/validate.js` | `validateField`, `validateForm` |
| Gráficas | `@/lib/charts.js` | `CHART`, `areaGradientDef`, `deviceFromUA`… |
| Export (Excel/Word/PDF) | `@/services/exportService.js`, `@/lib/exportTheme.js` | `exportStats`, paleta de export |
| API HTTP (axios) | `@/lib/api.js`, `@/services/index.js` | `api`, `authApi`, `formApi`, `adminApi`, `aiApi`… |
| Ubicaciones/catálogos CU | `@/lib/cubaLocations.js`, `@/lib/inclusiveOptions.js` | provincias, municipios, opciones inclusivas |
| Auto-grow textarea | `@/lib/useAutoGrow.js` | `useAutoGrow` |
| Compartir/portapapeles | `@/lib/shareUrl.js`, `@/lib/clipboard.js` | `buildNetworkShareUrl`, `copyText` |

---

## 3. Reglas de oro

1. **Colores por token.** Nunca un hex de la familia de marca: usa
   `@/shared/styles/tokens` o `var(--…)`. Lo verifica `npm run qa:brand`.
2. **Reexporta pegado a la fuente.** Si creas un skill nuevo reutilizable,
   añádelo a `index.ts` (si es TS) y a esta tabla.
3. **No reutilices a ciegas.** `@/lib/*` sigue siendo la fuente para lo JS;
   `@/shared/*` es la fachada para TS.
