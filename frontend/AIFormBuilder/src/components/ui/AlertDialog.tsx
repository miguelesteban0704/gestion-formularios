import { useSyncExternalStore, useCallback } from "react";
import { createPortal } from "react-dom";
import { Modal } from "./Modal";
import {
  subscribe,
  getSnapshot,
  remove as removeAlert,
  type AlertEntry,
  type AlertType,
} from "../../feedback/alertStore";

/* ═══════════════════════════════════════════════════════════════════════
   Capa de presentación de alertas de diálogo.
   Se suscribe a `alertStore` y renderiza un `Modal` por cada alerta activa.
   Se monta una vez en `main.jsx` (como `<Toaster />`).
   ═══════════════════════════════════════════════════════════════════════ */

const TONE_AURA: Record<AlertType, string> = {
  success: "var(--color-success)",
  error: "var(--color-danger)",
  info: "var(--color-info)",
  warning: "var(--color-warning)",
};

function AlertItem({ alert }: { alert: AlertEntry }) {
  const close = useCallback(() => removeAlert(alert.id), [alert.id, removeAlert]);
  const isError = alert.type === "error";

  return (
    <Modal
      open
      onClose={close}
      title={alert.title}
      description={alert.description}
      size="sm"
      variant={isError ? "danger" : "default"}
      aura={TONE_AURA[alert.type]}
      closeOnOverlay
      closeOnEsc
    />
  );
}

export function AlertDialog() {
  const alerts = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  if (alerts.length === 0) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] pointer-events-none">
      {alerts.map((a) => (
        <AlertItem key={a.id} alert={a} />
      ))}
    </div>,
    document.body
  );
}

export type { AlertType };
export { subscribe as subscribeAlerts, getSnapshot as getAlertSnapshot, removeAlert };
