import { isValidElement, type ReactNode } from "react";

/* ═══════════════════════════════════════════════════════════════════════
   Store global (singleton) del sistema de toasts — SIN JSX.
   La presentación vive en `components/ui/Toast.tsx`; aquí: estado,
   temporizadores y la API imperativa (sustituto de `sonner`).

   La API declara parámetros `unknown` a propósito: es heredada y flexible
   (string | { title, ... } | nodo React), y los consumidores son ~25
   ficheros que no deben cambiar de firma.
   ═══════════════════════════════════════════════════════════════════════ */

export type ToastType = "success" | "error" | "warning" | "info" | "loading";

export interface ToastAction {
  label?: ReactNode;
  onClick?: () => void;
  dismiss?: boolean;
  [k: string]: unknown;
}

export interface ToastEntry {
  id: string;
  key?: string | number | null;
  type: ToastType;
  title: string;
  description?: ReactNode;
  duration: number;
  action?: ToastAction;
  secondaryAction?: ToastAction;
  icon?: unknown;
  badge?: ReactNode;
  dismissible: boolean;
  progress?: unknown;
  version: number;
  _timer?: ReturnType<typeof setTimeout>;
}

/* ─── Estado ─────────────────────────────────────────────────────────── */
const MAX_VISIBLE = 5;

let _seq = 0;
let _toasts: ToastEntry[] = [];

export const getSnapshot = () => _toasts;

const _listeners = new Set<() => void>();
export const subscribe = (cb: () => void) => {
  _listeners.add(cb);
  return () => {
    _listeners.delete(cb);
  };
};

const commit = (next: ToastEntry[]) => {
  _toasts = next;
  for (const l of _listeners) l();
};

export function remove(id: string) {
  const next = _toasts.filter((t) => t.id !== id);
  if (next.length !== _toasts.length) commit(next);
}

export function removeAll() {
  if (_toasts.length) commit([]);
}

/* ─── Normalización (title, opts) | ({title, ...}) → entrada ─────────── */
type NewToast = Omit<ToastEntry, "id" | "key" | "version" | "_timer">;

function _normalize(type: ToastType, input: unknown, opts: unknown): NewToast {
  const asObject = !!input && typeof input === "object" && !isValidElement(input);
  const base = asObject
    ? (input as Record<string, unknown>)
    : { title: typeof input === "string" ? input : String(input ?? "") };
  const extra =
    typeof opts === "string"
      ? { description: opts }
      : opts && typeof opts === "object"
        ? (opts as Record<string, unknown>)
        : {};
  const merged = { ...base, ...extra };
  const description = merged.description ?? merged.message;
  return {
    type,
    title: typeof merged.title === "string" ? merged.title : String(merged.title ?? ""),
    description: description === undefined || description === null ? undefined : (description as ReactNode),
    duration: "duration" in merged ? Number(merged.duration) : type === "error" ? 5200 : 4200,
    action: merged.action ? { ...(merged.action as ToastAction) } : undefined,
    secondaryAction: merged.secondaryAction
      ? { ...(merged.secondaryAction as ToastAction) }
      : undefined,
    icon: merged.icon as ToastEntry["icon"],
    badge: merged.badge as ReactNode,
    dismissible: merged.dismissible !== false,
    progress: merged.progress,
  };
}

/* ─── Operaciones ────────────────────────────────────────────────────── */
function _push(type: ToastType, input?: unknown, opts?: unknown): string {
  const data = _normalize(type, input, opts);
  const inputKey =
    input && typeof input === "object" && !isValidElement(input)
      ? (input as Record<string, unknown>).id
      : undefined;
  const key = inputKey === undefined ? null : (inputKey as string | number);
  const existing = key === null ? null : _toasts.find((t) => t.key === key);
  // Misma clave → actualiza en el sitio (evita duplicados).
  const id = existing ? existing.id : `t-${Date.now()}-${++_seq}`;

  const toast: ToastEntry = {
    ...data,
    id,
    key: key ?? existing?.key ?? null,
    version: (existing?.version || 0) + 1,
  };
  // action inválida (p.ej. un nodo de React sin label) → se descarta
  if (toast.action && typeof toast.action === "object" && !toast.action.label && toast.action.children) {
    toast.action = undefined;
  }

  const next = existing
    ? _toasts.map((t) => (t.id === id ? toast : t))
    : [..._toasts, toast].slice(-MAX_VISIBLE);
  commit(next);

  if (toast.duration > 0) {
    if (toast._timer) clearTimeout(toast._timer);
    toast._timer = setTimeout(() => remove(id), toast.duration + 280);
  }
  return id;
}

function _update(id: string, patch: Record<string, unknown>) {
  const current = _toasts.find((t) => t.id === id);
  if (!current) return null;
  const patchType = (patch.type as ToastType | undefined) || current.type;
  const next = _normalize(patchType, { ...current, ...patch }, {});
  const merged: ToastEntry = {
    ...next,
    id: current.id,
    key: current.key,
    version: current.version + 1,
    _timer: current._timer,
  };
  if (patch.duration === undefined) {
    merged.duration =
      patch.type && patch.type !== current.type
        ? patch.type === "error"
          ? 5200
          : 4200
        : current.duration;
  }
  if (merged._timer) clearTimeout(merged._timer);
  if (merged.duration > 0) {
    merged._timer = setTimeout(() => remove(id), merged.duration + 280);
  } else {
    merged._timer = undefined;
  }
  commit(_toasts.map((t) => (t.id === id ? merged : t)));
  return id;
}

/* ─── API imperativa ─────────────────────────────────────────────────── */
export interface PromiseMessages {
  loading?: unknown;
  success?: unknown;
  error?: unknown;
  duration?: number;
  dismissible?: boolean;
}

export const API_METHODS = {
  success: (a?: unknown, o?: unknown) => _push("success", a, o),
  error: (a?: unknown, o?: unknown) => _push("error", a, o),
  warning: (a?: unknown, o?: unknown) => _push("warning", a, o),
  info: (a?: unknown, o?: unknown) => _push("info", a, o),
  loading: (a?: unknown, o?: unknown) => _push("loading", a, o),
  message: (a?: unknown, o?: unknown) => _push("info", a, o),
  toast: (a?: unknown, o?: unknown) => _push("info", a, o),
  update: (id: string, patch?: Record<string, unknown>) => _update(id, patch || {}),
  dismiss: (id?: string) => (id === undefined ? removeAll() : remove(id)),
  dismissAll: () => removeAll(),
  promise: <T,>(promise: Promise<T>, msgs: PromiseMessages = {}) => {
    const id = _push("loading", msgs.loading || "Cargando…", {
      duration: 999999,
      dismissible: msgs.dismissible !== false,
    });
    Promise.resolve(promise).then(
      (res) => {
        const msg =
          typeof msgs.success === "function"
            ? (msgs.success as (r: T) => unknown)(res)
            : msgs.success || "Listo";
        _update(
          id,
          typeof msg === "object" && msg !== null
            ? {
                ...(msg as Record<string, unknown>),
                type: (msg as { type?: string }).type || "success",
                duration: msgs.duration ?? 3200,
              }
            : { title: msg, type: "success", duration: msgs.duration ?? 3200 }
        );
      },
      (err) => {
        const msg =
          typeof msgs.error === "function"
            ? (msgs.error as (e: unknown) => unknown)(err)
            : msgs.error ||
              (err && typeof err === "object" && "message" in err
                ? (err as { message: unknown }).message
                : "Error");
        _update(
          id,
          typeof msg === "object" && msg !== null
            ? {
                ...(msg as Record<string, unknown>),
                type: (msg as { type?: string }).type || "error",
                duration: msgs.duration ?? 4600,
              }
            : { title: msg, type: "error", duration: msgs.duration ?? 4600 }
        );
      }
    );
    return promise;
  },
};

/* `_apiRef` es un mecanismo heredado de compatibilidad con <ToastProvider/>:
   sin provider, la API es directamente API_METHODS (objeto idéntico). */
let _apiRef: typeof API_METHODS | null = null;
export const getApi = () => _apiRef || API_METHODS;
export function registerApiRef(ref: typeof API_METHODS | null) {
  _apiRef = ref;
}

export type ToastApi = typeof API_METHODS & ((title?: unknown, opts?: unknown) => string);

/** API imperativa — sustituto directo de `import { toast } from "sonner"`. */
export const toast = Object.assign(
  (title?: unknown, opts?: unknown) => getApi().toast(title, opts),
  API_METHODS
) as ToastApi;

export default toast;