# Sistema de feedback (diálogos, alertas, confirmaciones, toasts) — Diseño

- **Fecha:** 2026-10-08
- **Estado:** aprobado en diseño, pendiente de revisión del spec
- **Proyecto:** `frontend/AIFormBuilder` (React 19 + Vite + Tailwind v4 + framer-motion)
- **Alcance:** refactor in‑place del subsistema de feedback + piezas que faltan + fix del portal del super_admin

---

## 1. Contexto y objetivo

El repo ya tiene ~70 % de lo pedido: un sistema de toasts con store singleton
(`Toast.jsx`, mapeado como alias de `sonner` en `vite.config.js`), un shell de
modal con focus trap/ESC/scroll lock (`Modal.jsx` + `hooks/useOverlay.js`), y un
`useConfirm` promesificado (`AdminKit.jsx`). Lo que falta es **unificar** esa
lógica dispersa, **tiparla**, **completar las piezas ausentes** y **documentarla**.

**Objetivo:** un único sistema de feedback con una sola receta visual
(glassmorphism + neumorphism sutil, variantes semánticas, animación con
`cubic-bezier(0.16, 1, 0.3, 1)`, light/dark, AA), sin romper la API pública.

**Éxito =** checklist final de este documento en verde: `lint`, `typecheck`
(nuevo), `build`, `qa:brand` y probes comparados antes/después, más la sección
de ejemplos en `DesignShowcase.jsx` revisada a mano en claro y oscuro.

## 2. Decisiones tomadas (con el usuario)

| Tema | Decisión |
|---|---|
| Estrategia | **Refactor in‑place + huecos**: no sistema paralelo, no migración gradual |
| Lenguaje | **TypeScript en todo el subsistema** (`.ts`/`.tsx`) + shim `src/types/jsx-modules.d.ts` para los imports `.jsx`/`.css` que toquen; script nuevo `npm run typecheck` (`tsc --noEmit`) |
| Dependencias | **Instalar `class-variance-authority`** (variantes). **NO Radix**: el repo ya tiene su propio focus trap + ESC por capas + scroll lock (`useOverlay.js`), usado también por `Drawer` y `CommandPalette`; Radix sería un segundo sistema de overlay |
| `useNotification()` | **Avisos persistentes del store** (no la campana `NotificationBell`, que queda como está) |
| Verificación | `lint + typecheck + build + qa:* + escaparate DesignShowcase`. **Sin** Vitest |
| Paleta semántica | **Unificar la app entera** a la paleta del spec |
| Portal del super | **Entra en este mismo lote** (acento tras logout + logo + anillo) |

## 3. Alcance

**Dentro:** `Toast`, `Modal` (+ variantes), `ConfirmProvider`/`useConfirm`,
`useOverlay`, componentes nuevos (`AlertDialog`, `SuccessAlert`, `DeleteDialog`,
`NotificationModal`, `DialogSkeleton`), hooks nuevos (`useDialog`, `useModal`,
`useDeleteConfirm`, `useNotification`), tokens, variantes CVA, i18n, docs,
escaparate, y el fix del portal del super (§9).

**Fuera:** `NotificationBell` y su feed de backend, `Drawer`, `Splash`,
`CommandPalette` (heredan el shell y las primitivas sin cambios), la paleta de
acento del formulario (`SettingsPanel`), data‑viz (`Prism*`), `qa/routes.js`
(27 fallos preexistentes del refactor de `routes.js`).

## 4. Arquitectura y mapa de ficheros

### 4.1 Nuevo: `src/feedback/` (el core)

| Fichero | Contenido |
|---|---|
| `designTokens.ts` | Paleta semántica, radios, sombras, duraciones/easings, z‑index. Exporta **nombres de CSS var** y constantes derivadas; nunca hex duplicados |
| `variants.ts` | Definiciones CVA: `alertVariant`, `dialogVariant`, `toastVariant`, `buttonVariant`, `sizeVariant` |
| `store.ts` | `createStore<T>()` + `useStore()` sobre `useSyncExternalStore` (extraído del singleton actual de Toast; lo reutiliza el store de notificaciones) |
| `toastStore.ts` | `push/update/promise/dismiss` + temporizadores, **sin JSX** |
| `notificationStore.ts` | Avisos persistentes (`duration: 0`), no‑leídos, limpieza |
| `overlay.ts` | `useFocusTrap`, `useScrollLock`, `useEscapeKey` (pila por capas) — migrado de `src/hooks/useOverlay.js` |
| `ConfirmProvider.tsx` | Contexto de confirmación (sale de `AdminKit.jsx`) |
| `types.ts` · `index.ts` | Tipos públicos + barrel |

### 4.2 Convertido (misma ruta, cambia la extensión)

- `src/components/ui/Toast.jsx` → **`Toast.tsx`**: solo presentación.
  Exporta idéntico: `toast`, `useToast`, `Toaster`, `ToastProvider`,
  `TOAST_POSITIONS`, `SonnerToaster`, `toastTypeMeta`, default.
- `src/components/ui/Modal.jsx` → **`Modal.tsx`**: shell + `ConfirmModal`,
  `DestructiveModal`, `FormModal`, `StatusModal`, `Info/Success/Error/Warning/LoadingModal`,
  `MODAL_Z`, `BACKDROP_Z`.
- `src/hooks/useOverlay.js` → **`useOverlay.ts`**: reexporta `src/feedback/overlay.ts`
  (se conserva `useBodyScrollLock`; se añade el alias `useScrollLock`).
- `src/components/admin/AdminKit.jsx` → sigue en `.jsx`, **reexporta**
  `ConfirmProvider` y `useConfirm` desde el core: sus 6 importadores no cambian.

### 4.3 Nuevos componentes (`src/components/ui/`)

- `AlertDialog.tsx` — advertencia/error no destructiva (tonos `warning`/`error`/`info`).
- `SuccessAlert.tsx` — éxito con `SuccessIcon` dibujándose (`role="status"`).
- `DeleteDialog.tsx` — destructivo con **confirmación escrita opcional**
  (`word="ELIMINAR"`, botón deshabilitado hasta coincidencia, `trim`, sensible a
  mayúsculas por defecto, `caseSensitive` configurable).
- `NotificationModal.tsx` — modal informativo con `header`/`body`/`footer` y
  acciones, montado sobre `Modal` (aporta slots y `aria` por defecto).
- `DialogSkeleton.tsx` — skeleton/loader dentro de un modal en estado `loading`.

### 4.4 Nuevos hooks (`src/hooks/`)

`useDialog.ts`, `useModal.ts`, `useConfirm.ts`, `useDeleteConfirm.ts`,
`useNotification.ts` (firmas en §6).

### 4.5 Tocados (mecánico)

| Fichero | Cambio |
|---|---|
| ~15 importadores | extensión `.jsx` → `.tsx` (`Modal`) y `.js` → `.ts` (`useOverlay`) |
| `vite.config.js` | alias `sonner` → `src/components/ui/Toast.tsx` |
| `main.jsx` | montar `<ConfirmProvider>` junto a `<Toaster/>` |
| `layouts/DashboardLayout.jsx` | retirar su `<ConfirmProvider>` (evita providers anidados) |
| `qa/brand-audit.js` | 4 entradas: rutas `Modal.jsx`/`Toast.jsx` → `.tsx`, regex de hex → paleta nueva y rutas de tokens, y el mapeo `"sonner"` |
| `package.json` | `class-variance-authority`, script `typecheck` |
| `src/index.css` | tokens semánticos unificados (§5) |
| `src/contexts/LanguageContext.jsx` | claves nuevas ES + EN |
| `src/pages/DesignShowcase.jsx` | sección «Sistema de feedback» |

**Sin tocar:** `crystal.css` (la receta Nocturne se conserva), los ~26 imports
`from "sonner"`, los 3 `await confirm(...)` admin, `ShareModal`,
`SessionAlert`, `AuthRequiredModal`, `AIGenerateModal`.

## 5. Sistema visual, tokens y animaciones

### 5.1 Una sola paleta (hoy conviven tres)

| Tono | `index.css` (hoy) | `crystal.css` (hoy) | componentes (hoy) | **nuevo** | `-ink` (texto AA) |
|---|---|---|---|---|---|
| success | `#0e9384` | `#10b981` | `#10b981` | **`#10B981`** | `#047857` |
| error | `#d14343` | `#f43f5e` | `#e11d48` | **`#EF4444`** | `#DC2626` |
| warning | `#d4a43a` | `#f59e0b` | `#f59e0b` | **`#F59E0B`** | `#B45309` |
| info | `#4f7de8` | `#4f7de8` | `#4f7de8` | **`#3B82F6`** | `#1D4ED8` |

- `index.css` define `--color-{success,danger,warning,info}` (+ `-soft`, `-ring`, **`-ink`**)
  y es la ÚNICA fuente. `crystal.css` (`.cr-tone-*-solid`) y los componentes dejan
  de escribir hex y usan `var(--color-*)`.
- **Dos niveles por tono** (requisito AA): la *base* para iconos, orbes y bordes
  (WCAG 1.4.11 ≥ 3:1, no texto) y **`-ink`** para cualquier texto sobre fondo
  claro (≥ 4,5:1). En oscuro, los tonos se mezclan con `color-mix` sobre el fondo
  para mantener el contraste.
- `loading`: gradiente animado
  `linear-gradient(90deg, var(--color-info), var(--color-brand-500), var(--color-info))`
  con `background-size: 200%` + shimmer (misma técnica que `sa-shimmer`).

### 5.2 Geometría, espaciado, tipografía (lo existente cumple; deltas)

- Radio: `--radius-modal: 18px`, `--radius-modal-lg: 20px` ✅ (spec: 16–24 px).
- **Padding del cuerpo de diálogo `py-2/3` → `py-4` (≥ 24 px)**; `gap-2` → `gap-3`
  en pies (12–16 px).
- Iconos 20–24 px ✅ (`h-5 w-5` en cabeceras, `h-6/h-7` en orbes).
- Bordes `1px` con blanco/`color-mix` al 8–10 % ✅; sombras multicapa teñidas
  con el tono ✅ (`cr-hairline`, `cr-orb`, `.cr-btn`).
- Títulos 600–700 con `var(--font-display)` ✅; cuerpo 400–450 ✅.

### 5.3 Animaciones y microinteracciones

| Elemento | Hoy | Cambio |
|---|---|---|
| Entrada de diálogo | `y:14 + scale .96`, spring 380 | **`scale(0.95) + opacity(0)` → `scale(1)`** con `cubic-bezier(0.16, 1, 0.3, 1)` |
| Salida | `y:8 + scale .97` | **`scale(0.98)` + fade** (duración 160 ms) |
| Backdrop | fade + blur progresivo | ✅ se conserva |
| Hover de botones | solo `:active` | **elevación sutil (`translateY(-1px)`) + brillo de borde** |
| Botón destructivo | estático | **`@keyframes danger-pulse`** (halo que late) antes de confirmar |
| Toast | spring + slide/fade + barra de progreso + pausa en hover | ✅ se conserva (la lógica va a `toastStore.ts`) |
| `prefers-reduced-motion` | parcial (CSS) | **`useReducedMotion()` en `Modal`/`Toast`**: entradas a fade puro, sin pulsación |

## 6. Hooks: API

Superficie pública **inalterada**:
`toast.*`, `useToast`, `Toaster`, `ToastProvider`, `TOAST_POSITIONS`,
`SonnerToaster`, `toastTypeMeta`, default; `Modal`, `ConfirmModal`,
`DestructiveModal`, `FormModal`, `StatusModal`, `Info/Success/Error/Warning/LoadingModal`,
`MODAL_Z`, `BACKDROP_Z`; `ConfirmProvider`, `useConfirm` (desde `AdminKit`);
`useFocusTrap`, `useBodyScrollLock`, `useEscapeKey`.

```ts
// src/hooks/useDialog.ts — promesa con resultado tipado
useDialog<T>(): {
  isOpen: boolean; data: T | null; isLoading: boolean; error: unknown;
  open(data?: T): Promise<T | null>;   // resuelve con el valor o null al cancelar
  close(result?: T): void; cancel(): void;
  setLoading(v: boolean): void; setError(e: unknown): void;
}

// src/hooks/useConfirm.ts — MISMA firma actual → compatibilidad total
useConfirm(): { confirm(opts: ConfirmOptions): Promise<boolean>; busy: boolean }
// ConfirmOptions = { title?, description?, confirmText?, cancelText?, icon?,
//                    detail?: string[], onConfirm?: () => Promise<void> | void, tone? }

// src/hooks/useDeleteConfirm.ts — wrapper destructivo
useDeleteConfirm(): { confirmDelete(opts: DeleteOptions): Promise<boolean>; busy: boolean }
// DeleteOptions añade: { word?: "ELIMINAR", requireWord?: boolean,
//                        caseSensitive?: boolean, onDeleted?: () => void }

// src/hooks/useModal.ts — estado puro, sin promesa
useModal<T>(): {
  isOpen: boolean; data: T | null; isLoading: boolean; error: unknown;
  open(data?: T): void; close(): void; toggle(): void;
  setData(v: T | null): void; setLoading(v: boolean): void; setError(e: unknown): void;
}

// src/hooks/useNotification.ts — avisos persistentes (store singleton)
useNotification(): {
  notifications: AppNotification[]; unread: number;
  notify(n: { title: string; description?: string; tone?: Tone; action?: Action }): string;
  dismiss(id: string): void; clear(): void; markAllRead(): void;
}
// Sin `duration` → nunca se auto‑cierra; capa propia dentro del <Toaster/>.

// src/hooks/useOverlay.ts (reexporta src/feedback/overlay.ts)
useFocusTrap(ref, active, { autoFocus }) · useScrollLock(active) · useEscapeKey(active, cb?)
// se conserva `useBodyScrollLock` como alias histórico.
```

**Reglas comunes:** todos exponen `isOpen · isLoading · data · error`, no
dependen del componente visual (estado/headless), `open()` resuelve **siempre**
(nunca queda colgada), cleanup correcto (temporizadores, listeners, foco),
generics donde aplique.

**Montaje:** `<ConfirmProvider>` sube a `main.jsx` (junto a `<Toaster/>`), así
`useConfirm()` funciona también en `/login`, portal del super y formularios
públicos; se retira el de `DashboardLayout`.

## 7. Componentes: API

```tsx
<AlertDialog open tone="warning|error|info" title description onCancel onConfirm? confirmText? />
<SuccessAlert open title description action? onClose />          // check animado, role="status"
<DeleteDialog open title? description? word="ELIMINAR" requireWord
              onConfirm onCancel loading />                      // write-to-confirm opcional
<NotificationModal open header body footer? tone? onClose />     // slots + aria por defecto
<DialogSkeleton rows={3} />                                     // dentro de <Modal> en loading
<ConfirmDialog /> ← alias de <ConfirmModal> (nombre del spec, API idéntica)
```

Todos montan sobre `<Modal>` (portal, focus trap, ESC, scroll lock, backdrop
blur) y usan `variants.ts` para tono/tamaño. Los wrappers existentes
(`ConfirmModal`, `StatusModal`, …) dejan de duplicar estilos y consumen las
mismas variantes.

## 8. Accesibilidad e i18n

- `role="dialog"` + `aria-modal` + `aria-labelledby/describedby` ✅ (conservado).
- Focus trap con retorno al disparador ✅; ESC por capas (solo el overlay
  superior responde) ✅; scroll lock con contador ✅.
- `aria-live`: `polite` en toasts, `assertive` en errores ✅; contenedor con
  `aria-atomic` ✅.
- `aria-busy` en `loading` ✅; `aria-invalid` + `aria-describedby` en errores
  inline ✅; **nuevo** en `DeleteDialog` (campo de confirmación escrita).
- Contraste AA en ambos temas con la capa `-ink` (§5.1).
- i18n: todas las cadenas nuevas por `LanguageContext.t()`, claves añadidas a
  los diccionarios **ES y EN** (`typeToConfirm`, `deleteHint`, `notificationsEmpty`,
  `dismissNotification`, …). Sin textos literalmente hardcodeados en componentes
  nuevos.

## 9. Portal del super: acento tras el logout

**Problema reportado:** al cerrar sesión en el super admin, el logo y el anillo
luminoso de la card de login no coinciden con el color configurado en Apariencia.

**Causa raíz (verificada en código):**

1. `AuthContext.logout()` hace `setUser(null)` (línea 68) y navega con
   `window.location.assign(SUPER_ADMIN_LOGIN_PATH)` **380 ms después** (línea 69‑77).
2. En ese intervalo, `PreferencesSync` (efecto 3, líneas 106‑127) detecta el
   cierre de sesión y ejecuta `setAccent(DEFAULT_ACCENT)` +
   `localStorage.setItem(ACCENT_KEY, "#00D2FF")` → el portal arranca siempre con
   el cian por defecto.
3. `sa-card`, `sa-card::before` (el **anillo**) y el halo del `sa-orb` sí leen
   `var(--color-brand-*)`, así que siguen el acento… que acaba de ser reseteado.
4. El **logo** (`<Logo>` → `/favicon.png`, PNG bicolor negro `#000000` + rojo
   `#d62828`, 73 % de píxeles transparentes) no sigue el acento **nunca**: su
   color está escrito en el PNG.

**Cambios:**

1. **Conservar el acento al cerrar sesión del super.**
   En `PreferencesSync`, el efecto 3 deja de resetear `accent` cuando el usuario
   anterior era `super_admin` (`prevUserRef.current?.role === "super_admin"`):
   tema e idioma siguen reseteándose, el acento se conserva en
   `formly_accent` y `ThemeContext` lo aplica al cargar el portal.
   *Alternativa descartada:* endpoint público que devuelva el acento (expone
   datos y añade latencia a un login).
2. **Hidratación explícita por cuenta:** si la cuenta que entra no tiene
   `accentColor` válido, la hidratación (efecto 1) escribe `DEFAULT_ACCENT` en
   vez de quedarse con el color heredado — así el color «se queda en el portal»
   y no se filtra a la cuenta siguiente.
3. **Logo teñido con el acento:** nuevo `LogoMark` (o prop `tint` en `Logo`)
   que usa el PNG como **máscara CSS**
   (`mask-image: url(/favicon.png)` + `background: linear-gradient(150°,
   var(--color-brand-400), var(--color-brand-600))`), solo en el `sa-orb` del
   portal. El canal alfa del PNG hace que funcione; se colapsa la bicoloridad a
   un monocromo con gradiente de marca.
   *Riesgo visual:* no puedo ver el render; si el resultado plano no gusta, la
   alternativa es conservar el PNG original y teñir solo orbe/anillo.
4. **Anillo (`sa-card::before`)**: ya usa `var(--color-brand-400/300)` → coincide
   automáticamente con el punto 1. Sin cambios de CSS.
5. **Recomendado:** el radial de `.sa-stage` tiene tonos escritos a mano
   (`rgb(14 147 132)` en claro, `rgb(0 210 255)` en oscuro) → pasar a
   `color-mix(in srgb, var(--color-brand-500) 8%, transparent)` para que el fondo
   también siga el acento.

## 10. Entregables y verificación

1. **`src/feedback/designTokens.ts`** — el `design-tokens` del spec (colores,
   radios, sombras, tiempos) referenciando CSS vars, sin hex duplicados.
2. **`docs/FEEDBACK_SYSTEM.md`** — API de cada hook y componente, ejemplos de
   uso real y guía de migración (solo cambian las extensiones de import).
3. **`DesignShowcase.jsx`** — sección «Sistema de feedback»: `ConfirmDialog`,
   `AlertDialog`, `SuccessAlert`, `DeleteDialog` (con input), `NotificationModal`,
   `DialogSkeleton`, los 5 tonos de toast, `toast.promise`, aviso persistente;
   revisado en claro y oscuro.
4. **`npm run typecheck`** (`tsc --noEmit`) en verde.

**Verificación:**

```bash
npm run lint        # oxlint
npm run typecheck   # nuevo: tsc --noEmit
npm run build       # Vite (aquí se han cazado siempre errores de import)
npm run qa:brand    # con sus 4 entradas actualizadas a la paleta/rutas nuevas
npm run qa:routes && npm run qa:nav && npm run qa:card && npm run qa:export
                    # comparar ANTES/DESPUÉS: qa:routes tiene 27 fallos
                    # PREEXISTENTES (refactor de routes.js del 06/10), no se arreglan aquí
```

## 11. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Renombrar `.jsx → .tsx` rompe imports con extensión explícita | Cambios mecánicos listados en §4.5; `vite build` es la red de seguridad (oxlint no resuelve exports) |
| `qa/brand-audit.js` lee rutas exactas y exige hex concretos | Actualizar sus 4 entradas (rutas + regex) manteniendo la intención de la regla |
| Unificar la paleta cambia aspecto fuera del feedback | Revisión visual del panel completo; los `-ink` garantizan AA donde había texto |
| `tsc` no corre en build → tipos decorativos | Script `typecheck` ejecutado como parte de la verificación |
| Teñido del logo con máscara puede no gustar | Decisión reversible; alternativa documentada en §9.3 |
| Reset del acento: orden de efectos vs. navegación | El `setTimeout` de 380 ms garantiza que el efecto corre antes de navegar; se verifica con `qa:accent-probe` |
| Sin repo git: no se puede commitear el spec | El archivo vive en `docs/superpowers/specs/`; sin commit |

## 12. Criterios de aceptación

- [ ] Todos los diálogos/alertas/toasts comparten tokens, variantes y receta visual
- [ ] Paleta semántica única (`--color-*` + `-ink`) y sin hex duplicados en componentes
- [ ] Light y dark probados en `DesignShowcase`
- [ ] Entradas/salidas con `cubic-bezier(0.16, 1, 0.3, 1)`, backdrop con blur progresivo, botón destructivo pulsando, toast con barra de progreso
- [ ] `prefers-reduced-motion` respetado en `Modal` y `Toast`
- [ ] `role="dialog"` + `aria-modal` + focus trap + ESC + retorno de foco + `aria-live` en toasts
- [ ] Contraste AA en claro y oscuro (capa `-ink`)
- [ ] Hooks tipados, documentados, expuestos en `docs/FEEDBACK_SYSTEM.md`
- [ ] Ejemplos reales en `DesignShowcase.jsx`
- [ ] API pública sin cambios: 26 imports de `sonner`, 3 `await confirm(...)`, exports de `Modal`/`AdminKit` intactos
- [ ] `lint` + `typecheck` + `build` + `qa:brand` en verde; probes sin regresiones nuevas
- [ ] Portal del super: tras logout, logo y anillo con el acento configurado
