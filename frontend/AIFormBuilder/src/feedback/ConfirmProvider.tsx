import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { DestructiveModal } from "../components/ui/Modal";
import type { ConfirmApi, ConfirmOptions } from "./types";

/* ═══════════════════════════════════════════════════════════════════════
   Confirmación contextual — confirm() asíncrono con un diálogo estilable.
   Portado intacto desde AdminKit (mismo comportamiento): `window.confirm`
   no se puede estilar, así que este hook expone `confirm({...})` y devuelve
   una promesa; la página hace `if (!(await confirm({...}))) return;` y el
   resto del flujo no cambia. Vive en el core para que main.jsx lo monte
   UNA vez para toda la app.
   ═══════════════════════════════════════════════════════════════════════ */

const ConfirmContext = createContext<ConfirmApi | null>(null);

export function ConfirmProvider({ children }: { children?: ReactNode }) {
  const [request, setRequest] = useState<ConfirmOptions | null>(null);
  const [busy, setBusy] = useState(false);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts?: ConfirmOptions) => {
    setRequest(opts ?? {});
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    setBusy(false);
    setRequest(null);
    resolverRef.current?.(value);
    resolverRef.current = null;
  }, []);

  const value: ConfirmApi = { confirm, busy };

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <DestructiveModal
        open={!!request}
        loading={busy}
        onClose={() => settle(false)}
        onConfirm={async () => {
          if (!request) return;
          setBusy(true);
          try {
            await request.onConfirm?.();
            settle(true);
          } catch (e) {
            setBusy(false);
            toast.error(
              (e instanceof Error ? e.message : undefined) || "No se pudo completar"
            );
            settle(false);
          }
        }}
        title={request?.title || "¿Confirmas la acción?"}
        description={request?.description}
        confirmText={request?.confirmText || "Eliminar"}
        cancelText={request?.cancelText || "Cancelar"}
        icon={request?.icon}
      >
        {request?.detail && (
          <ul className="mt-1 space-y-2 text-left text-[13px] text-muted">
            {request.detail.map((line) => (
              <li key={line} className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--color-danger)]" strokeWidth={1.9} aria-hidden="true" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        )}
      </DestructiveModal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmApi {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm necesita <ConfirmProvider>");
  return ctx;
}