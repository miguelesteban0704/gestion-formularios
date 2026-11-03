import { createStore } from "./store";
import type { AppNotification } from "./types";

/* ═══════════════════════════════════════════════════════════════════════
   Store singleton de los avisos PERSISTENTES.
   Un aviso persistente (duration: 0) no se auto-cierra: sobrevive a la
   sesión de render y vive en su propia capa dentro del <Toaster/>. Usa el
   `createStore` genérico de `store.ts` (mismo patrón useSyncExternalStore
   que toastStore, sin duplicar el Set de listeners). Los ids son estables
   (UUID o contador).
   ═══════════════════════════════════════════════════════════════════════ */

const store = createStore<AppNotification[]>([]);

let _seq = 0;

export const getNotifications = () => store.get();
export const subscribeNotifications = store.subscribe;

export function notify(n: Omit<AppNotification, "id" | "read">): string {
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `n-${Date.now()}-${++_seq}`;
  store.set((prev) => [{ ...n, id, read: false }, ...prev]);
  return id;
}

export function dismiss(id: string) {
  store.set((prev) => {
    const next = prev.filter((x) => x.id !== id);
    return next.length !== prev.length ? next : prev;
  });
}

export function clear() {
  if (store.get().length) store.set([]);
}

export function markAllRead() {
  const current = store.get();
  if (!current.some((x) => !x.read)) return;
  store.set(current.map((x) => ({ ...x, read: true })));
}