# Plan: Sistema de feedback (diálogos, alertas, toasts) + portal del super

- **Spec:** [`docs/superpowers/specs/2026-10-08-sistema-feedback-design.md`](../specs/2026-10-08-sistema-feedback-design.md)
- **Fecha:** 2026-10-08 · **cwd:** `frontend/AIFormBuilder`
- **Contexto verificado esta sesión:** `npx tsc --noEmit` → 0 errores; `node qa/brand-audit.js` → TODO CORRECTO.
- **⚠️ Sin repo git:** el workspace no es un repositorio, así que **no hay pasos de commit**. El gate de cada tarea es su bloque "Then run" (verificación), que sustituye al commit como punto de control.

---

## Convenciones globales (léelas antes de empezar)

1. **oxlint no resuelve exports de módulos**: cualquier cambio de imports/renombrados se comprueba SIEMPRE con `npm run build`, además de `npm run lint`.
2. **Windows/PowerShell**: los comandos se lanzan con `node`/`npm`; no uses `&&` entre comandos si el segundo depende de la salida (usa varios pasos de shell separados).
3. **No rompas la API pública**: los ~26 `import { toast } from "sonner"`, los exports de `Modal`/`Toast`/`AdminKit`/`useOverlay` siguen existiendo con las mismas firmas (solo cambian extensiones de fichero).
4. **TDD adaptado**: no hay framework de tests. El "test" de cada tarea = el bloque **Then run** (lint/typecheck/build/auditorías) + los invariantes:
   - `rg -n "10b981|0e9384|e11d48|f43f5e|4f7de8" src/components/ui src/feedback src/lib/designTokens.ts src/index.css` → **0 coincidencias** esperadas al final (paleta solo en vars).
   - `rg -n "^export " src/components/ui/Toast.jsx src/components/ui/Modal.jsx` **antes** de convertir (para no perder ningún export).
5. **Verificación visual**: se hace a mano en `DesignShowcase.jsx` (tarea 9) en claro y oscuro.
6. Prefijos de errores de `qa/routes.js` (~27 fallos PREEXISTENTES del refactor de `routes.js` del 06/10) son la línea base; no se arreglan aquí.

---

## Línea base (captúrala al empezar y consérvala en `~/sesion-baseline.txt`)

```powershell
npm run lint
npx tsc --noEmit
npm run build
node qa/brand-audit.js
npm run qa:routes   # esperado: ~27 fallos preexistentes (anótalo)
npm run qa:nav; npm run qa:card; npm run qa:export
```

---

## Mapa de tareas (orden y dependencias)

| # | Tarea | Depende de | Gate |
|---|---|---|---|
| 1 | Cimientos (CVA, shim de tipos, typecheck, tsconfig) | — | lint + typecheck + build |
| 2 | Tokens unificados + `designTokens.ts` + variantes CVA | 1 | build + brand-audit |
| 3 | `overlay.ts` + `useOverlay.ts` (re-export) | 2 | lint + typecheck + build |
| 4 | `toastStore.ts` + `Toast.tsx` (+ alias `sonner`) | 1,2,3 | build + brand-audit |
| 5 | `Modal.tsx` + `ConfirmDialog` alias + 14 importadores | 2,3 | lint + typecheck + build + brand-audit |
| 6 | `ConfirmProvider`/`useConfirm` al core (montaje en main) | 5 | build + typecheck |
| 7 | Hooks nuevos (`useDialog`/`useModal`/`useDeleteConfirm`/`useNotification`) | 4 | lint + typecheck + build |
| 8 | Componentes nuevos (AlertDialog/SuccessAlert/DeleteDialog/NotificationModal/DialogSkeleton) + i18n | 6,7 | lint + typecheck + build |
| 9 | Escaparate `DesignShowcase` (ejemplos + revisión visual) | 8 | manual claro/oscuro |
| 10 | Portal del super: acento + logo teñido + anillo | 3 | build + manual |
| 11 | Docs `FEEDBACK_SYSTEM.md` + verificación final + checklist del spec | todas | suite completa |

---

## Tarea 1 — Cimientos

**Objetivo:** dependencia CVA instalada, TypeScript capaz de importar el JS/JSX existente, y el script `typecheck` registrado.

**Ficheros:**
- Crear `src/types/jsx-modules.d.ts`
- Editar `tsconfig.json` (paths)
- Editar `package.json` (script)
- `package.json` + lockfile (instalación)

**Pasos:**
1. `npm i class-variance-authority` (comprobar que quedó en `dependencies`).
2. Crear `src/types/jsx-modules.d.ts` con:
   ```ts
   /* El repo es JS/JSX con tsconfig acotado a .ts/.tsx (allowJs off).
      Este shim permite que el subsistema TS importe el resto del proyecto.
      Las declaraciones sin cuerpo = `any`: lo que se persigue aquí es poder
      escribir .tsx, no tipar el código JS heredado. */
   declare module "*.jsx";
   declare module "*.js";
   declare module "*.css";
   ```
3. En `tsconfig.json`, dentro de `compilerOptions.paths`, añadir junto a `"@/*"`:
   ```json
   "sonner": ["./src/components/ui/Toast.tsx"]
   ```
   (para que un `.tsx` que importe `sonner` reciba los tipos reales de nuestro Toast en vez de `any`).
4. En `package.json` scripts:
   ```json
   "typecheck": "tsc --noEmit"
   ```

**Then run:** `npm run lint`, `npm run typecheck`, `npm run build` → los tres, salida 0.

---

## Tarea 2 — Paleta unificada + `designTokens.ts` + variantes CVA

**Objetivo:** una sola paleta semántica (`#10B981 · #EF4444 · #F59E0B · #3B82F6`), capa `-ink` para AA en claro/oscuro, `designTokens.ts` como API JS de los tokens (referencias a CSS vars, sin hex), y las definiciones CVA.

**Ficheros:**
- Convertir `src/lib/designTokens.js` → `src/lib/designTokens.ts` (borrar el `.js`; antes: `rg -n "designTokens" src` debe mostrar SOLO ese fichero — está muerto, sin importadores)
- Crear `src/feedback/variants.ts`
- Editar `src/index.css`
- Editar `src/components/ui/crystal.css`
- Editar `qa/brand-audit.js`

**Pasos:**

1. **`src/lib/designTokens.ts`** — port el contenido del `.js` a TS manteniendo `typography`, `shadows`, `dark` y `easing` tal cual, PERO:
   - `palette` pasa a referencias de CSS var (nunca hex dentro de este fichero):
   ```ts
   export const palette = {
     success: {
       DEFAULT: "var(--color-success)",
       soft: "var(--color-success-soft)",
       ring: "var(--color-success-ring)",
       ink: "var(--color-success-ink)",
     },
     warning: {
       DEFAULT: "var(--color-warning)",
       soft: "var(--color-warning-soft)",
       ink: "var(--color-warning-ink)",
     },
     danger: {
       DEFAULT: "var(--color-danger)",
       soft: "var(--color-danger-soft)",
       ink: "var(--color-danger-ink)",
       controlled: "var(--color-danger-ink)",
     },
     info: {
       DEFAULT: "var(--color-info)",
       soft: "var(--color-info-soft)",
       ink: "var(--color-info-ink)",
     },
     ink: { DEFAULT: "#0f172a", muted: "#64748b", dark: "#e9edf4" },
     surface: { DEFAULT: "#ffffff", soft: "#f8fafc", dark: "#12151d" },
   };
   ```
   - `radii.modal` → `"var(--radius-modal)"` y `radii.modalLg` → `"var(--radius-modal-lg)"` (los del CSS, no los valores históricos divergentes).
   - Añadir `durations = { dialog: 320, dialogExit: 160, toast: 240 }` y `z = { backdrop: "var(--z-modal-backdrop)", modal: "var(--z-modal)", toast: "var(--z-toast)" }`.
   - Si el fichero exporta algo que nadie usaba → se conserva igual (es la API token del spec; entregable nº1).

2. **`src/index.css`** — en `:root` (líneas 26-34) sustituir:
   ```css
   --color-success: #10B981;
   --color-success-soft: #e8f7f1;
   --color-success-ring: #10B981;
   --color-success-ink: #047857;
   --color-warning: #F59E0B;
   --color-warning-soft: #fdf3e1;
   --color-warning-ink: #B45309;
   --color-danger: #EF4444;
   --color-danger-soft: #fef1f1;
   --color-danger-ink: #DC2626;
   --color-info: #3B82F6;
   --color-info-soft: #eaf1fe;
   --color-info-ink: #1D4ED8;
   ```
   - En el bloque `.dark` (zona líneas ~994-1060) añadir sobreescrituras AA (texto/iconos legibles sobre fondo oscuro):
     ```css
     --color-success-ink: #34D399;
     --color-warning-ink: #FBBF24;
     --color-danger-ink: #F87171;
     --color-info-ink: #7AA4FF;
     ```
   - Tokens de toast (bloque claro ~921-933) → `var()`:
     ```css
     --toast-success-accent: var(--color-success);
     --toast-error-accent: var(--color-danger);
     --toast-warning-accent: var(--color-warning);
     --toast-info-accent: var(--color-info);
     ```
     y bloque oscuro (~1008-1019) → los `-ink`:
     ```css
     --toast-success-accent: var(--color-success-ink);
     --toast-error-accent: var(--color-danger-ink);
     --toast-warning-accent: var(--color-warning-ink);
     --toast-info-accent: var(--color-info-ink);
     ```
   - Utilidad `btn-danger` (~líneas 395-411): pasar la escala rosa a coral `#EF4444`-family:
     ```css
     background-image: linear-gradient(145deg,
       color-mix(in srgb, #f87171 92%, #ffffff) 0%,
       #EF4444 52%,
       #991b1b 100%);
     border-color: color-mix(in srgb, #fca5a5 40%, transparent);
     --btn-bevel: color-mix(in srgb, #ffffff 42%, transparent);
     --btn-contact: color-mix(in srgb, #7f1d1d 42%, transparent);
     --btn-lift: color-mix(in srgb, #b91c1c 55%, transparent);
     --btn-halo: color-mix(in srgb, #EF4444 26%, transparent);
     --btn-hi-border: color-mix(in srgb, #fecaca 55%, transparent);
     ```
   - Añadir tokens de animación junto a los existentes (~línea 94):
     ```css
     --duration-dialog: 320ms;
     --duration-dialog-exit: 160ms;
     --duration-toast: 240ms;
     --gradient-loading: linear-gradient(90deg, var(--color-info), var(--color-brand-500), var(--color-info));
     ```
   - Añadir (fuera de `:root`, nivel raíz) las animaciones nuevas:
     ```css
     @keyframes danger-pulse {
       0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-danger) 45%, transparent); }
       50%      { box-shadow: 0 0 0 7px color-mix(in srgb, var(--color-danger) 0%, transparent); }
     }
     @media (prefers-reduced-motion: reduce) {
       .cr-btn-danger-pulse { animation: none !important; }
     }
     ```

3. **`src/components/ui/crystal.css`** (264-267) → referencias:
   ```css
   .cr-tone-green-solid { --toast-tint: var(--color-success); --cr-orb: var(--color-success); --card-tint: var(--color-success); }
   .cr-tone-red-solid   { --toast-tint: var(--color-danger); --cr-orb: var(--color-danger); --card-tint: var(--color-danger); }
   .cr-tone-blue-solid  { --toast-tint: var(--color-info); --cr-orb: var(--color-info); --card-tint: var(--color-info); }
   .cr-tone-amber-solid { --toast-tint: var(--color-warning); --cr-orb: var(--color-warning); --card-tint: var(--color-warning); }
   ```

4. **`src/feedback/variants.ts`**:
   ```ts
   import { cva } from "class-variance-authority";

   export const dialogSize = cva("", {
     variants: {
       size: { sm: "max-w-[420px]", md: "max-w-[560px]", lg: "max-w-[680px]", xl: "max-w-[880px]" },
     },
     defaultVariants: { size: "md" },
   });

   export const alertTone = cva("", {
     variants: {
       tone: {
         success: "cr-tone-green-solid",
         error: "cr-tone-red-solid",
         warning: "cr-tone-amber-solid",
         info: "cr-tone-blue-solid",
         loading: "cr-tone-blue-solid",
       },
     },
     defaultVariants: { tone: "info" },
   });

   export const buttonVariant = cva("", {
     variants: {
       variant: {
         neutral: "cr-btn cr-btn-neutral",
         primary: "btn-primary",
         success: "cr-btn cr-btn-green",
         danger: "btn-danger cr-btn-danger-pulse",
         info: "cr-btn cr-btn-blue",
       },
     },
     defaultVariants: { variant: "neutral" },
   });

   export type AlertTone = "success" | "error" | "warning" | "info" | "loading";
   export type DialogSize = "sm" | "md" | "lg" | "xl";
   ```

5. **`qa/brand-audit.js`**:
   - Borrar la entrada `{ f: "components/ui/crystal.css", r: /10b981/, ... }` (ya no hay hex ahí).
   - **No tocar aún** las de `Modal.jsx`/`Toast.jsx`/alias: se actualizan en sus tareas (4 y 5).

**Then run:**
```powershell
npm run build
node qa/brand-audit.js          # TODO CORRECTO
npm run lint
```
Salida esperada del audit: ya **no** aparece `EXCEPCION … crystal.css`; `sin alcanzar: src/lib/designTokens.ts` (aún nadie la importa; se resuelve en tareas 4/5).

---

## Tarea 3 — `src/feedback/overlay.ts` (migración tipada)

**Objetivo:** las tres primitivas de overlay viven en el core TS; `useOverlay.js` desaparece y su ruta la ocupa un re-export.

**Ficheros:**
- Crear `src/feedback/overlay.ts`
- Crear `src/hooks/useOverlay.ts` (re-export)
- Borrar `src/hooks/useOverlay.js`
- Editar los 4 importadores: `src/layouts/DashboardLayout.jsx:29`, `src/components/CommandPalette.jsx:27`, `src/components/ui/Drawer.jsx:6`, `src/components/ui/Modal.jsx:9` → extensión `.js` → `.ts`

**Pasos:**
1. Port lógica literal de `useOverlay.js` a `overlay.ts` tipando parámetros (`ref: RefObject<HTMLElement | null>`, `active: boolean`, callbacks `() => void`) y exportando con los mismos nombres: `useFocusTrap`, `useBodyScrollLock`, `useEscapeKey`.
2. `src/hooks/useOverlay.ts`:
   ```ts
   export { useFocusTrap, useBodyScrollLock, useEscapeKey } from "../feedback/overlay.js";
   export { useScrollLock } from "../feedback/overlay.js"; // alias moderno
   ```
   *(Ojo: en `.ts` usa la extensión de import que resuelva Vite/tsc; aquí la fuente es `overlay.ts`, el `moduleResolution: bundler` resuelve `overlay.js`→`overlay.ts`, pero por claridad puedes escribir `../feedback/overlay` sin extensión si oxlint/vite se quejan.)*
3. Añadir en `overlay.ts` el alias:
   ```ts
   export const useScrollLock = useBodyScrollLock;
   ```
4. Editar los 4 importadores: `"../hooks/useOverlay.js"` → `"../hooks/useOverlay.ts"` (o `"./useOverlay"`), sin tocar los nombres importados.

**Then run:** `npm run lint`, `npm run typecheck`, `npm run build` → 0.

---

## Tarea 4 — `toastStore.ts` + `Toast.tsx` (+ alias `sonner`)

**Objetivo:** separar la lógica (store) del JSX, tipar, y recolocar las tintas a vars/CVA sin cambiar NINGÚN export.

**Ficheros:**
- Crear `src/feedback/store.ts` (store externo genérico)
- Crear `src/feedback/toastStore.ts`
- Convertir `src/components/ui/Toast.jsx` → `src/components/ui/Toast.tsx`
- Editar `vite.config.js` (alias `sonner`)
- Editar `qa/brand-audit.js` (alias + entrada Toast)

**Pasos:**
1. **`src/feedback/store.ts`** — extraer del singleton actual de Toast el patrón `useSyncExternalStore`:
   ```ts
   export function createStore<T>(initial: T) {
     let state = initial;
     const listeners = new Set<() => void>();
     return {
       get: () => state,
       set(next: T | ((prev: T) => T)) { state = typeof next === "function" ? (next as (p: T) => T)(state) : next; listeners.forEach((l) => l()); },
       subscribe: (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; },
     };
   }
   export function useStore<T>(store: ReturnType<typeof createStore<T>>) {
     return useSyncExternalStore(store.subscribe, store.get);
   }
   ```
2. **`src/feedback/toastStore.ts`** — port literal (sin JSX ni hooks): estado de toasts, `push/update/dismiss/dismissAll`, temporizadores de auto-dismiss con pausa en hover (si la lógica de pausa vive hoy en el componente, se pasa aquí vía `setPaused(id, bool)`), el objeto `toast` (success/error/warning/info/loading/message/promise/update/dismiss), `TOAST_POSITIONS` y `useToast` → `useToast` reexporta desde el store (`useSyncExternalStore`).
   - Las tintas de `TYPE` (líneas ~115-119 del Toast actual) pasan de hex a **clases CVA**: se elimina `tint: "#…"` del meta y el item renderiza `alertTone({ tone })` para inyectar `--toast-tint` (oído por `crystal.css`). Que los componentes dibujen el icono con `stroke` del tone como hoy.
3. **`src/components/ui/Toast.tsx`** — JSX presentacional: `Toaster` (portal, posiciones, `aria-live`, barra de progreso, iconos con morph `SuccessIcon`/`shouldMorph`), `ToastProvider`, y re-export de `toast`, `useToast`, `TOAST_POSITIONS` desde `toastStore.ts`. Conservar `useContext(LanguageContext)` dentro de los componentes.
   - Guarda previo: `rg -n "^export " src/components/ui/Toast.jsx` → verificar los 5 (o los que haya) y que TODOS sigan exportándose.
4. **`vite.config.js`**: `sonner: .../Toast.jsx` → `sonner: .../Toast.tsx`.
5. **`qa/brand-audit.js`**: `ALIAS.sonner` → `"components/ui/Toast.tsx"`; borrar la entrada `{ f: "components/ui/Toast.jsx", ... }` (ya no hay hex).

**Then run:**
```powershell
rg -n "10b981|e11d48|f43f5e|4f7de8" src/components/ui/Toast.tsx src/feedback   # 0
npm run build          # valida alias + exports
npm run lint
npm run typecheck
node qa/brand-audit.js # TODO CORRECTO; ya NO lista Toast entre las excepciones
```

---

## Tarea 5 — `Modal.tsx` + `ConfirmDialog` + 14 importadores

**Objetivo:** shell de diálogo tipado, consumiendo variantes/tokens, con la animación del spec y el alias `ConfirmDialog`.

**Ficheros:**
- Convertir `src/components/ui/Modal.jsx` → `src/components/ui/Modal.tsx`
- Editar los 14 importadores (extensión `.jsx` → `.tsx`):
  `layouts/DashboardLayout.jsx` (30), `components/auth/SessionAlert.jsx` (5), `components/auth/AuthRequiredModal.jsx` (2), `components/admin/AdminKit.jsx` (13), `components/CommandPalette.jsx` (28), `pages/Responses.jsx` (25), `components/builder/ShareModal.jsx` (4), `components/forms/FormsBrowser.jsx` (10), `pages/DesignShowcase.jsx` (3), `components/builder/AIGenerateModal.jsx` (4), `pages/Builder.jsx` (39), `pages/admin/AccessUrls.jsx` (24), `pages/admin/Entities.jsx` (8), `pages/admin/Users.jsx` (22)
- Editar `qa/brand-audit.js` (entrada `Modal.jsx` → borrar)

**Pasos:**
1. Guarda previo: `rg -n "^export " src/components/ui/Modal.jsx` → los 12 exports (confirmados: `MODAL_Z, BACKDROP_Z, Modal, ConfirmModal, DestructiveModal, FormModal, StatusModal, InfoModal, SuccessModal, ErrorModal, WarningModal, LoadingModal`). Portarlos todos idénticos.
2. Sustituir el mapa `SIZES` por `dialogSize` de `variants.ts` (mismo valor para `sm/md/lg/xl`).
3. Hex → CVA/vars:
   - `confirm` orb: `danger ? "var(--color-danger)" : "var(--color-success)"` (hoy `#e11d48`/`#10b981`).
   - `modalAura`: `isDanger ? "var(--color-danger)" : "var(--color-brand-500)"`.
   - `StatusModal` TONE: quitar `tint`, render con clase `alertTone({ tone })` + icons de `lucide-react` como hoy; `loading` mantiene `animate-spin`.
4. Animación (spec §5.3): en el `motion.div` del panel:
   ```jsx
   const reduce = useReducedMotion();
   initial={{ opacity: 0, scale: reduce ? 1 : 0.95 }}
   animate={{ opacity: 1, scale: 1 }}
   exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.16, ease: "easeOut" } }}
   transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
   ```
   Backdrop intacto (fade + blur progresivo).
5. Geometría: body `py-2 sm:py-3` → `py-4`; pie `gap-2` → `gap-3`.
6. Añadir al final:
   ```tsx
   export const ConfirmDialog = ConfirmModal; // alias del spec (API idéntica)
   ```
7. **`qa/brand-audit.js`**: borrar la entrada `{ f: "components/ui/Modal.jsx", ... }`.

**Then run:**
```powershell
rg -n "10b981|e11d48|f43f5e|4f7de8" src/components/ui/Modal.tsx              # 0
npm run lint; npm run typecheck; npm run build
node qa/brand-audit.js   # TODO CORRECTO
```

---

## Tarea 6 — `ConfirmProvider`/`useConfirm` al core

**Objetivo:** el diálogo de confirmación vive en `src/feedback/` y queda disponible en TODA la app (main), sin romper a los 6 consumidores de `AdminKit`.

**Ficheros:**
- Crear `src/feedback/types.ts` (tipos públicos: `ConfirmOptions`, `Tone`, …)
- Crear `src/feedback/ConfirmProvider.tsx` (port de `AdminKit.jsx` líneas ~337-444)
- Crear `src/hooks/useConfirm.ts` (re-export tipado)
- Editar `src/components/admin/AdminKit.jsx` (borrar implementación + re-export)
- Editar `src/main.jsx` (montar `<ConfirmProvider>`)
- Editar `src/layouts/DashboardLayout.jsx` (quitar su `<ConfirmProvider>`)

**Pasos:**
1. `src/feedback/types.ts`:
   ```ts
   export type Tone = "success" | "error" | "warning" | "info" | "loading";
   export interface ConfirmOptions {
     title?: string; description?: string; confirmText?: string; cancelText?: string;
     danger?: boolean; detail?: string[]; icon?: unknown; // "unknown": icon as ComponentType
     tone?: Tone; onConfirm?: () => Promise<void> | void;
   }
   ```
2. Port `ConfirmProvider` y `useConfirm` desde `AdminKit.jsx` SIN cambiar comportamiento (try/catch de `onConfirm`, `setBusy`, `toast.error(t(...))` — ojo: `t` viene de `useLanguage`, que ahora se importa desde un `.jsx`; con el shim queda `any`, válido). El contexto y el `useContext` también se mueven.
3. `AdminKit.jsx`: borrar `ConfirmProvider`/`useConfirm`/context y añadir:
   ```jsx
   export { ConfirmProvider, useConfirm } from "../../feedback/ConfirmProvider.tsx";
   ```
   Comprobar que `rg -n "ConfirmProvider|createContext" src/components/admin/AdminKit.jsx` → solo la línea del re-export.
4. `main.jsx`: importar `ConfirmProvider` y envolver `<App/>` justo debajo del `LanguageProvider` (por encima de `BrowserRouter` no es necesario; que quede entre `LanguageProvider` y `BrowserRouter`), junto al `<Toaster/>`.
5. `DashboardLayout.jsx`: eliminar el wrapper `<ConfirmProvider>` (responsable hoy de montarlo) y su import de AdminKit solo para eso. Revisar qué más importa de AdminKit para no romper.

**Then run:** `npm run lint`, `npm run typecheck`, `npm run build`. Comprobación manual rápida: `useConfirm` sigue usándose en Users/Entities/AccessUrls sin cambios de código.

---

## Tarea 7 — Hooks nuevos + capa de avisos persistentes

**Objetivo:** `useDialog`, `useModal`, `useDeleteConfirm`, `useNotification` (+ store) tipados, headless, con cleanup.

**Ficheros:**
- Crear `src/feedback/notificationStore.ts`
- Crear `src/hooks/useNotification.ts`
- Crear `src/hooks/useDialog.ts`, `src/hooks/useModal.ts`, `src/hooks/useDeleteConfirm.ts`
- Editar `src/feedback/types.ts` (añadir `AppNotification`, `DeleteOptions`)
- Editar `src/components/ui/Toast.tsx` (capa persistente en el Toaster)

**Pasos (firmas EXACTAS del spec §6):**

1. **`useDialog.ts`** — con `useRef` para resolver:
   ```ts
   export function useDialog<T>() {
     const [state, setState] = useState<{ isOpen: boolean; data: T | null; isLoading: boolean; error: unknown }>({ isOpen: false, data: null, isLoading: false, error: null });
     const resolverRef = useRef<((value: T | null) => void) | null>(null);
     const open = useCallback((data?: T) => {
       setState((s) => ({ ...s, isOpen: true, data: data ?? null, error: null }));
       return new Promise<T | null>((resolve) => { resolverRef.current = resolve; });
     }, []);
     const resolveWith = useCallback((value: T | null) => { resolverRef.current?.(value); resolverRef.current = null; }, []);
     const close = useCallback((result?: T) => { resolveWith(result ?? null); setState((s) => ({ ...s, isOpen: false })); }, [resolveWith]);
     const cancel = useCallback(() => close(null), [close]);
     const setLoading = (isLoading: boolean) => setState((s) => ({ ...s, isLoading }));
     const setError = (error: unknown) => setState((s) => ({ ...s, error }));
     return { ...state, open, close, cancel, setLoading, setError };
   }
   ```
2. **`useModal.ts`** — igual pero sin resolver/promise: `open(data?)` setea `isOpen:true`, `close()` `false`, `toggle()`, `setData/setLoading/setError`.
3. **`useDeleteConfirm.ts`** — envuelve a `useConfirm`:
   ```ts
   export function useDeleteConfirm() {
     const { confirm, busy } = useConfirm();
     const confirmDelete = useCallback((opts: DeleteOptions) =>
       confirm({ danger: true, confirmText: opts.confirmText ?? "Eliminar", cancelText: opts.cancelText ?? "Cancelar", ...opts }),
       [confirm]);
     return { confirmDelete, busy };
   }
   ```
4. **`notificationStore.ts`** — store singleton como el de toasts:
   ```ts
   export interface AppNotification { id: string; title: string; description?: string; tone?: Tone; read?: boolean; action?: { label: string; onClick: () => void }; }
   notify(n): id · dismiss(id) · clear() · markAllRead() · unread (derivado)
   ```
   (`tone` del `types.ts`; los ids se generan con `crypto.randomUUID()` o contador.)
5. **`useNotification.ts`** — hook que devuelve `{ notifications, unread, notify, dismiss, clear, markAllRead }` vía `useSyncExternalStore`.
6. **Toast.tsx** — dentro del portal del `Toaster`, debajo de la pila de toasts, renderizar una segunda capa con los `AppNotification` (`duration: 0`, sin auto-dismiss, sin barra de progreso, con `dismiss`). El componente usa las mismas variantes `alertTone`.
7. **`useToast`** en `toastStore.ts`: añadir sobrecargas tipadas a `toast.promise<T>` si hoy no está tipado (mantener comportamiento).

**Then run:** `npm run lint`, `npm run typecheck`, `npm run build`. Invariante: `rg -n "10b981|0e9384|e11d48|f43f5e|4f7de8" src/feedback` → 0.

---

## Tarea 8 — Componentes nuevos + i18n

**Objetivo:** las 5 piezas ausentes del spec, montadas sobre el shell, con variantes CVA y traducciones ES/EN.

**Ficheros:**
- Crear `src/components/ui/AlertDialog.tsx`, `SuccessAlert.tsx`, `DeleteDialog.tsx`, `NotificationModal.tsx`, `DialogSkeleton.tsx`
- Editar `src/contexts/LanguageContext.jsx` (bloques `en:` y `es:`)

**Pasos:**
1. **`AlertDialog.tsx`** — props `{ open, tone = "warning"|"error"|"info", title, description, onCancel, onConfirm?, confirmText? }` → monta `<Modal>` header/body/footer con `alertTone({ tone })`, icono por tono, botones `buttonVariant`. `role/aria` los da el Modal.
2. **`SuccessAlert.tsx`** — `{ open, title, description, action?, onClose }` → `<SuccessIcon>` de `animated-state-icons` en un orbe `cr-tone-green-solid`, `role="status"`, `aria-live="polite"`.
3. **`DeleteDialog.tsx`** — `{ open, title?, description?, word = "ELIMINAR", requireWord = false, caseSensitive = true, onConfirm, onCancel, loading }`:
   - input con `aria-label`: emplea `t("typeToConfirm")`; `aria-describedby` al hint `t("deleteHint")`.
   - comprobación con `trim()` (+ `caseSensitive`), botón confirmar deshabilitado si `requireWord && value !== word`.
   - botón destructivo con clase `cr-btn cr-btn-red cr-btn-danger-pulse` (animación de la tarea 2) SOLO mientras `armado` está a false.
4. **`NotificationModal.tsx`** — `{ open, header, body, footer?, tone?, onClose }` → Modal con slots `header/body/footer` y `aria-labelledby`/`aria-describedby` por defecto cuando `header` es string.
5. **`DialogSkeleton.tsx`** — `{ rows = 3 }` → skeleton shimmer (`sa-shimmer`/clases existentes) + `aria-busy="true"`.
6. **i18n** — en `LanguageContext.jsx`, claves nuevas en `en` y `es` (buscar nombres libres primero con rg):
   `typeToConfirm`, `deleteHint`, `dismissNotification`, `notificationsEmpty`, `confirmDelete`, `cancel`, `confirm`, `close` (estas últimas ya existen: NO duplicarlas).
7. Exportar todo también por `src/components/ui/index.ts`? **No**: el repo no tiene barrel por carpeta; se importan directo (consistencia).

**Then run:** `npm run lint`, `npm run typecheck`, `npm run build`.

---

## Tarea 9 — Escaparate `DesignShowcase.jsx`

**Objetivo:** ejemplos de uso real (spec §Entregables) y revisión visual en claro/oscuro.

**Pasos:**
1. Nueva sección «Sistema de feedback» en `DesignShowcase.jsx` con botones que abren, uno a uno: `ConfirmDialog`, `AlertDialog` (warning/error), `SuccessAlert`, `DeleteDialog` (con `requireWord`), `NotificationModal`, `DialogSkeleton` (dentro de un `<Modal>` en `loading`).
2. Demos de toasts: 5 tonos, `toast.promise` con mock de 1,2s, y un aviso persistente con `useNotification().notify`.
3. Mostrar uso real de `useConfirm()` con `await` y de `useDeleteConfirm()`.
4. Ajustar el demo existente de `Tooltip tint="#d14343"` (línea 145) → `"var(--color-danger)"`.
5. Revisión manual en claro y oscuro: foco atrapado, ESC, retorno de foco, contraste, `prefers-reduced-motion` (forzar en devtools y comprobar que las entradas son fades).

**Then run:** `npm run build` + lista de comprobación manual (checklist del spec) en `http://localhost:5173/design-showcase` si la ruta existe; si no, usar el propio DesignShowcase (`npm run dev`).

---

## Tarea 10 — Portal del super: acento + logo + anillo

**Objetivo:** tras el logout del super, el portal muestra el color configurado en Apariencia (logo teñido + card/anillo siguen el acento).

**Causa raíz (verificada):** `AuthContext.logout()` hace `setUser(null)` y navega 380 ms después; `PreferencesSync` efecto 3 (líneas 106-127) resetea `accent` a `DEFAULT_ACCENT` en ese intervalo. El anillo (`sa-card::before`) y la card YA usan `--color-brand-*`; lo único fuera de acento es el PNG del logo.

**Ficheros:**
- Editar `src/components/settings/PreferencesSync.jsx`
- Editar `src/components/Logo.jsx`
- Editar `src/index.css` (`.logo-tint`, `.sa-stage`)
- Editar `src/components/auth/SuperAdminStage.jsx`

**Pasos:**

1. **`PreferencesSync.jsx`** — import `isSuper` de `../../lib/roles.js`; en el efecto 3 capturar el usuario anterior ANTES de actualizar el ref:
   ```jsx
   const prevUser = prevUserRef.current;
   const wasLoggedIn = Boolean(prevUser);
   const isLoggedIn = Boolean(user);
   prevUserRef.current = user;
   if (!wasLoggedIn || isLoggedIn) return;
   ...
   const keepAccent = isSuper(prevUser);   // el super es el dueño de la marca: su acento sobrevive al logout
   if (!keepAccent) {
     setAccent(DEFAULT_ACCENT);
     localStorage.setItem(ACCENT_KEY, DEFAULT_ACCENT);
   }
   ```
   El resto (theme, idioma, limpieza de caché) sigue igual para todos los roles.
2. **Hidratación explícita** — efecto 1: cuando la cuenta no tiene `accentColor` válido, escribe el default en vez de heredar:
   ```jsx
   if (isAccentHex(settings.accentColor)) {
     if (settings.accentColor !== accent) setAccent(settings.accentColor);
   } else if (accent !== DEFAULT_ACCENT) {
     setAccent(DEFAULT_ACCENT);            // sin herencia silenciosa del color del super
   }
   ```
   y sincronizar `lastSentRef.current.accentColor = isAccentHex(settings.accentColor) ? settings.accentColor : DEFAULT_ACCENT` para no disparar el PUT innecesario del efecto 2.
3. **`Logo.jsx`** — prop `tint = false`. Con `tint`, en vez del `<img>`:
   ```jsx
   <span role="img" aria-label={t("appName")} className="logo-tint" style={{ width: size, height: size }} />
   ```
4. **`index.css`**:
   ```css
   .logo-tint {
     display: inline-block;
     flex-shrink: 0;
     background: linear-gradient(150deg, var(--color-brand-400), var(--color-brand-600));
     -webkit-mask: url("/favicon.png") center / contain no-repeat;
     mask: url("/favicon.png") center / contain no-repeat;
     filter: drop-shadow(0 2px 3px rgb(15 23 42 / 0.18));
   }
   ```
   y en `.sa-orb img` ampliar el selector a `.sa-orb img, .sa-orb .logo-tint`.
   `.sa-stage` (claro y `.dark`): `rgb(14 147 132 / 0.08)` → `color-mix(in srgb, var(--color-brand-500) 8%, transparent)` y `rgb(0 210 255 / 0.08)` → `color-mix(in srgb, var(--color-brand-500) 8%, transparent)`.
5. **`SuperAdminStage.jsx`** (42-43): `<Logo showText={false} size={24} tone="dark" tint />`.

**Then run:** `npm run build`, `node qa/brand-audit.js`. Manual: loguear como super → Apariencia → cambiar acento → logout → el portal debe mostrar el acento configurado (orb/logo teñido + card y anillo). Logout de un usuario normal → sigue cayendo al default.

---

## Tarea 11 — Docs + verificación final

**Ficheros:**
- Crear `docs/FEEDBACK_SYSTEM.md` (raíz del workspace, junto a `RBAC_ACCESO.md`)

**Pasos:**
1. `docs/FEEDBACK_SYSTEM.md`: API de cada hook/componente con firmas TS, ejemplos de uso (`<ConfirmDialog/>`, `useDialog`, `useConfirm`, `useDeleteConfirm`, `useModal`, `useNotification`, `toast.*`), guía de migración (solo cambian extensiones de import `.jsx → .tsx` / `.js → .ts`; alias `sonner` interno), y la tabla de tokens (tone → var → ink).
2. Verificación completa con la suite de la línea base + comparativa **antes/después**:
   ```powershell
   npm run lint; npm run typecheck; npm run build
   node qa/brand-audit.js
   npm run qa:routes   # mismo número de fallos que la línea base (~27, preexistentes)
   npm run qa:nav; npm run qa:card; npm run qa:export
   ```
3. Recorrer la checklist del spec (§12) y marcar.

---

## Review Focus — los 5 fallos más probables y cómo se cazan

1. **API pública rota por el renombrado**: 14 imports de `Modal` + 4 de `useOverlay` no se actualizan a `.tsx`/`.ts`. → Gate: `npm run build` (falla Vite) + `rg -n "ui/Modal\\.jsx|useOverlay\\.js"` → 0.
2. **`sonner` sin el alias correcto**: se convierte Toast pero `vite.config`/`brand-audit` siguen apuntando a `.jsx`. → Gate: build + audit (`node qa/brand-audit.js` debe reportar el sistema de toasts VIVO, no `MUERTO`).
3. **Paleta nueva por rango AA**: un tone base usado como texto (contraste < 4,5:1). → Gate: revisar que todo texto nuevo use `-ink` y el `rg` de hex en `src/feedback`/`Toast.tsx`/`Modal.tsx` = 0; verificación visual claro/oscuro en el showcase.
4. **Efectos de logout/hidratación**: guard de `isSuper(prevUser)` capturado DESPUÉS de `prevUserRef.current = user` (bug clásico). → Gate: orden literal de la tarea 10; probar el flujo manual de logout super/normal.
5. **`tsc` decorativo**: se escribe `.tsx` que importa `.jsx` sin shim y el `typecheck` explota. → Gate: `npm run typecheck` en cada tarea (shim creado en la tarea 1).