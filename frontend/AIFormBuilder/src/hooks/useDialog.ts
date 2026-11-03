import { useCallback, useRef, useState } from "react";

/* Diálogo con promesa tipada — headless.
   `open(data?)` resuelve SIEMPRE (con el resultado o null al cancelar);
   el consumidor decide quién lo pinta. */

export function useDialog<T = unknown>() {
  const [state, setState] = useState<{
    isOpen: boolean;
    data: T | null;
    isLoading: boolean;
    error: unknown;
  }>({ isOpen: false, data: null, isLoading: false, error: null });
  const resolverRef = useRef<((value: T | null) => void) | null>(null);

  const open = useCallback((data?: T) => {
    setState((s) => ({ ...s, isOpen: true, data: data ?? null, error: null }));
    return new Promise<T | null>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const resolveWith = useCallback((value: T | null) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
  }, []);

  const close = useCallback(
    (result?: T) => {
      resolveWith(result ?? null);
      setState((s) => ({ ...s, isOpen: false }));
    },
    [resolveWith]
  );

  const cancel = useCallback(() => close(undefined), [close]);
  const setLoading = useCallback(
    (isLoading: boolean) => setState((s) => ({ ...s, isLoading })),
    []
  );
  const setError = useCallback(
    (error: unknown) => setState((s) => ({ ...s, error })),
    []
  );

  return { ...state, open, close, cancel, setLoading, setError };
}