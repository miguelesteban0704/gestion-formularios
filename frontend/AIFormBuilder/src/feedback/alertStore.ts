import { type ReactNode } from "react";

/* ═══════════════════════════════════════════════════════════════════════
   Store global (singleton) de alertas de diálogo — SIN JSX.
   La presentación vive en `components/ui/AlertDialog.tsx`; aquí: estado
   y la API imperativa (sustituto de `toast.success/error` para alertas
   que el usuario debe ver en un diálogo, no en un toast efímero).
   ═══════════════════════════════════════════════════════════════════════ */

export type AlertType = "success" | "error" | "info" | "warning";

export interface AlertEntry {
  id: string;
  type: AlertType;
  title: string;
  description?: ReactNode;
  duration: number; // ms antes de auto-cerrar; 0 = solo se cierra al hacer clic
}

/* ─── Estado ─────────────────────────────────────────────────────────── */
const MAX_VISIBLE = 5;

let _seq = 0;
let _alerts: AlertEntry[] = [];

export const getSnapshot = () => _alerts;

const _listeners = new Set<() => void>();
export const subscribe = (cb: () => void) => {
  _listeners.add(cb);
  return () => {
    _listeners.delete(cb);
  };
};

const commit = (next: AlertEntry[]) => {
  _alerts = next;
  for (const l of _listeners) l();
};

export function remove(id: string) {
  const next = _alerts.filter((a) => a.id !== id);
  if (next.length !== _alerts.length) commit(next);
}

export function removeAll() {
  if (_alerts.length) commit([]);
}

/* ─── Normalización ─────────────────────────────────────────────────── */
type NewAlert = Omit<AlertEntry, "id">;

function _normalize(type: AlertType, input: unknown, opts: unknown): NewAlert {
  const asObject = !!input && typeof input === "object";
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
    duration: "duration" in merged ? Number(merged.duration) : type === "error" ? 6000 : 4000,
  };
}

/* ─── Operaciones ───────────────────────────────────────────────────── */
function _push(type: AlertType, input?: unknown, opts?: unknown): string {
  const data = _normalize(type, input, opts);
  const id = `a-${Date.now()}-${++_seq}`;

  const alert: AlertEntry = {
    ...data,
    id,
  };

  const next = [..._alerts, alert].slice(-MAX_VISIBLE);
  commit(next);

  if (alert.duration > 0) {
    setTimeout(() => remove(id), alert.duration + 280);
  }
  return id;
}

/* ─── API imperativa ───────────────────────────────────────────────── */
export const alertAPI = {
  success: (a?: unknown, o?: unknown) => _push("success", a, o),
  error: (a?: unknown, o?: unknown) => _push("error", a, o),
  info: (a?: unknown, o?: unknown) => _push("info", a, o),
  warning: (a?: unknown, o?: unknown) => _push("warning", a, o),
  dismiss: (id?: string) => (id === undefined ? removeAll() : remove(id)),
  dismissAll: () => removeAll(),
};

/** API imperativa — sustituto directo de `toast.success/error` para alertas de diálogo. */
export const alert = Object.assign(
  (title?: unknown, opts?: unknown) => alertAPI.info(title, opts),
  alertAPI
) as typeof alertAPI & ((title?: unknown, opts?: unknown) => string);

export default alert;
