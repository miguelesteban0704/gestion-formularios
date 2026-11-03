# Sistema de feedback — Toasts · Diálogos · Confirmaciones · Avisos

Un único sistema tipado (TypeScript) para toda la UI de feedback de
AIFormBuilder: toasts, modales, diálogos de confirmación, estados de
resultado, avisos persistentes y los hooks que los gobiernan. Todo cuelga de
una paleta semántica y de unas variantes CVA; nada escribe un hex a mano.

- **Core:** `src/feedback/` — stores, tipos públicos, variantes CVA, overlay, ConfirmProvider.
- **Presentación:** `src/components/ui/` — `Toast.tsx`, `Modal.tsx` y los componentes nuevos.
- **Hooks:** `src/hooks/` — `useDialog`, `useModal`, `useConfirm`, `useDeleteConfirm`, `useNotification`, `useOverlay`.

---

## 1. Toasts (`sonner`)

El alias `sonner` sigue existiendo: **no cambia ningún import**. Todo lo que
antes hacía `import { toast } from "sonner"` sigue funcionando.

```ts
import { toast, Toaster } from "sonner";
```

API imperativa (sustituto directo de `sonner`, con `title`/`description`):

```ts
toast.success("Publicado", { description: "Ya está recibiendo respuestas.", action: { label: "Ver más", onClick: () => ... } });
toast.error("No se pudo guardar");
toast.warning("Límite casi alcanzado");
toast.info("Enlace copiado");
toast.loading("Procesando…");
toast.promise(promise, { loading: "Guardando…", success: "Guardado", error: "Falló" });   // genérico <T>
toast.update(id, { title: "…", type: "success" });   // carga→éxito/error en el MISMO toast
```

Presentación disponibles desde `Toast.tsx`:

| Export | Uso |
|---|---|
| `<Toaster position="top-right" />` | capa de toasts + avisos persistentes (portal) |
| `useToast()` | API si se prefiere hook |
| `ToastProvider` | contexto opcional (compatibilidad) |
| `TOAST_POSITIONS` | 6 posiciones (`top/bottom` × `left/center/right`) |
| `SonnerToaster`, `toastTypeMeta` | re-exports de compatibilidad |

El `Toaster` monta además la **capa de avisos persistentes** (ver §5):

```jsx
<main.jsx>
  <QueryClientProvider>
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <BrowserRouter>
            <ConfirmProvider>
              <App />
              <Toaster position="top-right" />
            </ConfirmProvider>
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
```

### Tipos de toast

| type | Tono | Clase |
|---|---|---|
| `success` | verde | `cr-tone-green-solid` |
| `error` | rojo/coral | `cr-tone-red-solid` |
| `warning` | ámbar | `cr-tone-amber-solid` |
| `info` | azul | `cr-tone-blue-solid` |
| `loading` | azul + morph | `cr-tone-blue-solid` |

El par `loading → success` dibuja un **solo icono que se transforma en su
sitio** (`SuccessIcon` de `animated-state-icons`), igual en toast y en modal
(`shouldMorph` de `state-morph`).

---

## 2. Modales (`Modal` y familia)

`src/components/ui/Modal.tsx` — 12 exports + alias:

```ts
MODAL_Z, BACKDROP_Z, Modal, ConfirmModal, DestructiveModal, FormModal,
StatusModal, InfoModal, SuccessModal, ErrorModal, WarningModal, LoadingModal,
ConfirmDialog   // alias de ConfirmModal (API idéntica)
```

```tsx
import { Modal, ConfirmModal, DestructiveModal, FormModal, InfoModal, SuccessModal, ErrorModal, WarningModal, LoadingModal, StatusModal, ConfirmDialog } from "../components/ui/Modal.tsx";
```

Props de `<Modal>` (todas opcionales salvo `open`):

```ts
interface ModalProps {
  open: boolean;
  onClose?: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";               // dialogSize
  variant?: "default" | "danger" | "form";
  closeOnOverlay?: boolean;                        // true
  closeOnEsc?: boolean;                            // true
  initialFocus?: string;                           // legado: aceptado y NO usado
  ariaBusy?: boolean;
  orb?: ReactNode;                                 // cabecera centrada con orbe
  aura?: string;                                   // var(--color-*) del diálogo
}
```

Reglas del sistema:
- **El aura sale de un token**, nunca de un hex: por omisión
  `var(--color-brand-500)`; peligro/éxito/aviso se piden con `aura`.
- El orbe se tiñe solo con `--glass-chroma`/`cr-tone-*`.
- `StatusModal` usa `tone` y `alertTone({ tone })`; el tinte NO se pinta en JS.
- Animación: `useReducedMotion` respetado (fades si reduce), escala + fade.

---

## 3. Confirmaciones (`ConfirmProvider` / `useConfirm`)

Montado UNA vez en `main.jsx`. La API pública sigue exportándose desde
`AdminKit` (sin romper consumidores); el core vive en `src/feedback/ConfirmProvider.tsx`.

```ts
// src/hooks/useConfirm.ts (re-export del core)
const { confirm, busy } = useConfirm();
const ok = await confirm({
  title: "¿Eliminar formulario?",
  description: "Se borrarán todas las respuestas.",
  danger: true,
  confirmText: "Eliminar",
  cancelText: "Cancelar",
  icon: Trash2,                       // opcional
  detail: ["Respuestas", "Estadísticas"],   // lista de consecuencias
  onConfirm: async () => { await api.delete(id); },  // promesa → spinner + toast de error
});
if (ok) { /* confirmado */ }
```

`ConfirmOptions` completa:

```ts
interface ConfirmOptions {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  detail?: string[];
  icon?: ComponentType<{ className?: string; strokeWidth?: number }>;
  tone?: Tone;                                   // "success" | "error" | "warning" | "info" | "loading"
  onConfirm?: () => Promise<void> | void;
}
```

---

## 4. Hooks nuevos

```ts
// src/hooks/useDialog.ts — promesa con resultado tipado
const dialog = useDialog<FormData>();
await dialog.open(initialData);          // → T | null (null al cancelar)
dialog.close(result); dialog.cancel();
dialog.setLoading(true); dialog.setError(err);

// src/hooks/useModal.ts — estado puro sin promesa
const modal = useModal<FormData>();
modal.open(data); modal.close(); modal.toggle();
modal.setData(v); modal.setLoading(b); modal.setError(e);

// src/hooks/useDeleteConfirm.ts — borrado destructivo con confirmación escrita
const { confirmDelete, busy } = useDeleteConfirm();
const ok = await confirmDelete({
  title: "Eliminar registro",
  description: "…",
  requireWord: true,             // exige teclear la palabra (DeleteDialog)
  word: "ELIMINAR",
  caseSensitive: true,
  onDeleted: () => refetch(),
});

// src/hooks/useNotification.ts — avisos persistentes del store
const { notifications, unread, notify, dismiss, clear, markAllRead } = useNotification();
```

---

## 5. Avisos persistentes

`src/feedback/notificationStore.ts` (singleton sobre `store.ts`):

```ts
interface AppNotification {
  id: string;                 // crypto.randomUUID() (o contador)
  title: string;
  description?: string;
  tone?: Tone;
  read?: boolean;
  action?: { label: string; onClick: () => void };
}
notify({ title, description, tone }) → string (id)
dismiss(id) · clear() · markAllRead()
```

No se auto-cierran (`duration: 0`): viven en su propia capa dentro del
`<Toaster/>`, SIEMPRE debajo de la pila de toasts, con el mismo `alertTone`.
`NotificationBell` (el icono de la campana) queda como estaba.

---

## 6. Componentes nuevos

| Componente | Props | Cuándo |
|---|---|---|
| `AlertDialog.tsx` | `{ open, tone?=warning/error/info, title, description, onCancel, onConfirm?, confirmText?, cancelText? }` | aviso no bloqueante con acción |
| `SuccessAlert.tsx` | `{ open, title, description?, action?, onClose? }` | éxito no bloqueante (`role=status`, `aria-live=polite`) |
| `DeleteDialog.tsx` | `{ open, title?, description?, word?="ELIMINAR", requireWord?, caseSensitive?=true, onConfirm?, onCancel?, loading?, confirmText?, cancelText? }` | borrado con confirmación escrita |
| `NotificationModal.tsx` | `{ open, header?, body?, footer?, tone?, onClose? }` | modal con slots header/body/footer |
| `DialogSkeleton.tsx` | `{ rows?=3, className? }` | skeleton shimmer dentro de un `<Modal>` en loading |

Ejemplos:

```tsx
<DeleteDialog
  open={modal === "delete"}
  requireWord
  onConfirm={() => { api.del(); }}
  title="¿Eliminar este formulario?"
  description="Esta acción no tiene vuelta atrás."
/>

<Modal open={modal === "skeleton"} title="Cargando datos" size="md">
  <DialogSkeleton rows={4} />
</Modal>
```

---

## 7. Tokens (tone → var → ink)

Paleta semántica única (AA en claro/oscuro):

| Tone | var | -soft | -ink |
|---|---|---|---|
| success | `--color-success` `#10B981` | `--color-success-soft` `#e8f7f1` | `--color-success-ink` `#047857` |
| danger | `--color-danger` `#EF4444` | `--color-danger-soft` `#fef1f1` | `--color-danger-ink` `#DC2626` |
| warning | `--color-warning` `#F59E0B` | `--color-warning-soft` `#fdf3e1` | `--color-warning-ink` `#B45309` |
| info | `--color-info` `#3B82F6` | `--color-info-soft` `#eaf1fe` | `--color-info-ink` `#1D4ED8` |

Variantes CVA en `src/feedback/variants.ts`: `dialogSize`, `alertTone`,
`buttonVariant` (`neutral/primary/success/danger/info`). El danger pulse
(`cr-btn-danger-pulse`) tiene guarda de `prefers-reduced-motion`.

---

## 8. Guía de migración

Lo único que cambia al consumir el sistema desde JSX son **extensiones de
import** (el contenido de cada fichero se mantiene):

| Antes | Después |
|---|---|
| `components/ui/Toast.jsx` | `components/ui/Toast.tsx` (o `import … from "sonner"`) |
| `components/ui/Modal.jsx` | `components/ui/Modal.tsx` |
| `hooks/useOverlay.js` | `hooks/useOverlay.ts` |
| `AdminKit` ConfirmProvider | re-export: `import { ConfirmProvider, useConfirm } from "../components/admin/AdminKit"` (sin cambio) |

Reglas de extensión:
- Entre ficheros TS se importa **sin** extensión (`../feedback/overlay`).
- Los `.jsx` importan TS con extensión explícita (`../ui/Modal.tsx`).

---

## 9. Accesibilidad

- `Modal`: focus trap, foco restaurado al origen, ESC y click fuera (configurables), `role="dialog"`, `aria-modal`, `aria-labelledby/describedby` automáticos.
- `StatusModal`/`SuccessAlert`: `role="status"` + `aria-live="polite"`; `loading` bloquea cierre (`aria-busy`).
- Animaciones: `prefers-reduced-motion` → fades (sin escala/desplazamiento).
- `DeleteDialog`: input con `aria-label` (typeToConfirm) y hint `aria-describedby` (deleteHint).