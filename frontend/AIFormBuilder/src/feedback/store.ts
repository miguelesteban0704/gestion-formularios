import { useSyncExternalStore } from "react";

/* Store externo genérico — patrón useSyncExternalStore compartido por el
   sistema de feedback. Los stores singleton (toasts, avisos) pueden usarlo
   o mantener su propio set de listeners; este helper evita duplicar el
   pattern cuando solo cambia la forma del estado. */

export interface Store<T> {
  get: () => T;
  set: (next: T | ((prev: T) => T)) => void;
  subscribe: (listener: () => void) => () => void;
}

export function createStore<T>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set(next) {
      state = typeof next === "function" ? (next as (prev: T) => T)(state) : next;
      for (const l of listeners) l();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** Hook de lectura reactiva de un Store<T>. */
export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}