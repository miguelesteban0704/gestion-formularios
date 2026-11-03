import { useCallback, useState } from "react";

/* Estado puro de modal — sin promesa: `open(data?)`, `close()`, `toggle()`.
   Headless, con los mismos campos que useDialog para que un <Modal> pueda
   consumir cualquiera de los dos. */

export function useModal<T = unknown>() {
  const [state, setState] = useState<{
    isOpen: boolean;
    data: T | null;
    isLoading: boolean;
    error: unknown;
  }>({ isOpen: false, data: null, isLoading: false, error: null });

  const open = useCallback(
    (data?: T) => setState((s) => ({ ...s, isOpen: true, data: data ?? null, error: null })),
    []
  );
  const close = useCallback(() => setState((s) => ({ ...s, isOpen: false })), []);
  const toggle = useCallback(() => setState((s) => ({ ...s, isOpen: !s.isOpen })), []);
  const setData = useCallback(
    (v: T | null) => setState((s) => ({ ...s, data: v })),
    []
  );
  const setLoading = useCallback(
    (isLoading: boolean) => setState((s) => ({ ...s, isLoading })),
    []
  );
  const setError = useCallback(
    (error: unknown) => setState((s) => ({ ...s, error })),
    []
  );

  return { ...state, open, close, toggle, setData, setLoading, setError };
}