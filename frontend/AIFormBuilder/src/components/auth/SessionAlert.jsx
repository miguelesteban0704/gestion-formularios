import { useEffect, useState, useCallback } from "react";
import { ShieldAlert, Monitor, Smartphone, Tablet, Laptop, LogOut, X } from "lucide-react";
import { authApi } from "../../services/index.js";
import { useAuth } from "../../hooks/useAuth.js";
import { Modal } from "../ui/Modal.tsx";
import { Button } from "../ui/Button.jsx";
import { useLanguage } from "../../contexts/LanguageContext.jsx";

function DeviceIcon({ device }) {
  const d = String(device).toLowerCase();
  if (d === "mobile") return <Smartphone className="h-4 w-4" />;
  if (d === "tablet") return <Tablet className="h-4 w-4" />;
  return <Laptop className="h-4 w-4" />;
}

function formatDevice(session, isSpanish) {
  const unknown = isSpanish ? "Desconocido" : "Unknown";
  const desktop = isSpanish ? "Escritorio" : "Desktop";
  const browser = session.browser || unknown;
  const os = session.os || unknown;
  const device = session.device || desktop;
  const ip = session.ip || (isSpanish ? "IP desconocida" : "Unknown IP");
  return { browser, os, device, ip };
}

export function SessionAlert() {
  const { isAuthenticated } = useAuth();
  const { language } = useLanguage();
  const isSpanish = language === "es";
  const [sessions, setSessions] = useState([]);
  const [open, setOpen] = useState(false);
  const [dismissedCount, setDismissedCount] = useState(() => {
    try { return Number(sessionStorage.getItem("session_alert_dismissed") || 0); } catch { return 0; }
  });

  const checkSessions = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await authApi.getSessions();
      const list = data.sessions || [];
      setSessions(list);
      if (list.length > 1 && list.length !== dismissedCount) {
        setOpen(true);
      }
    } catch (e) {
      const status = e?.response?.status || e?.status;
      if (status === 429) return; // rate limit — no spamear
    }
  }, [isAuthenticated, dismissedCount]);

  useEffect(() => {
    checkSessions();
    if (!isAuthenticated) return;
    const id = setInterval(checkSessions, 30000);
    return () => clearInterval(id);
  }, [checkSessions, isAuthenticated]);

  // Escucha evento de nueva sesión via polling de notificaciones? backend ya crea notificación,
  // pero el check periódico es suficiente.

  const handleDismiss = () => {
    setOpen(false);
    try { sessionStorage.setItem("session_alert_dismissed", String(sessions.length)); } catch {}
    setDismissedCount(sessions.length);
  };

  const handleRevokeOthers = async () => {
    try {
      await authApi.revokeOtherSessions();
      await checkSessions();
      handleDismiss();
    } catch (e) {
      console.error(e);
    }
  };

  if (!open || sessions.length <= 1) return null;

  const others = sessions.filter(s => !s.isCurrent);
  const current = sessions.find(s => s.isCurrent);
  const fmtCurrent = current ? formatDevice(current, isSpanish) : null;

  return (
    <Modal
      open={open}
      onClose={handleDismiss}
      title={isSpanish ? "Varios inicios de sesión detectados" : "Multiple logins detected"}
      description={isSpanish
        ? `Tu cuenta está activa en ${sessions.length} dispositivos. Por seguridad te mostramos dónde.`
        : `Your account is active on ${sessions.length} devices.`}
      size="md"
      orb={
        <span className="cr-orb cr-orb-lg text-white" style={{ "--cr-orb": "#e8a317" }} aria-hidden="true">
          <ShieldAlert className="h-7 w-7 drop-shadow-sm" strokeWidth={2.2} />
        </span>
      }
      /* Aviso de seguridad: el ámbar es el significado (hay sesiones abiertas
         que no reconoces), no decoración, así que el aura se declara. */
      aura="#e8a317"
      footer={
        <>
          <button type="button" onClick={handleDismiss} className="cr-btn cr-btn-neutral min-w-[96px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-2">
            {isSpanish ? "Entendido" : "Dismiss"}
          </button>
          <button
            type="button"
            onClick={handleRevokeOthers}
            className="cr-btn cr-btn-red min-w-[108px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2"
          >
            <LogOut className="h-4 w-4" /> {isSpanish ? "Cerrar otras sesiones" : "Close other sessions"}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>{isSpanish ? "Si no reconoces algún dispositivo, cierra esa sesión inmediatamente." : "If you don't recognize a device, close that session."}</span>
        </div>

        <div className="space-y-2">
          {current && (
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-3 dark:border-brand-800/50 dark:bg-brand-950/20">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-brand-700 dark:text-brand-300">
                <Monitor className="h-3.5 w-3.5" /> {isSpanish ? "Este dispositivo (actual)" : "This device (current)"}
              </p>
              <div className="mt-1.5 flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-100">
                <DeviceIcon device={current.device} />
                <span>{fmtCurrent.browser} • {fmtCurrent.os} • {fmtCurrent.device}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">IP {fmtCurrent.ip} • {new Date(current.lastActive).toLocaleString(isSpanish ? "es-ES" : "en-US")}</p>
            </div>
          )}

          {others.map((s) => {
            const fmt = formatDevice(s, isSpanish);
            return (
              <div key={s.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                    <DeviceIcon device={s.device} /> {fmt.browser} {isSpanish ? "en" : "on"} {fmt.os} ({fmt.device})
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">IP {fmt.ip} • {isSpanish ? "Última actividad" : "Last activity"} {new Date(s.lastActive).toLocaleString(isSpanish ? "es-ES" : "en-US")}</p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{isSpanish ? "Creada" : "Created"} {new Date(s.createdAt).toLocaleString(isSpanish ? "es-ES" : "en-US")}</p>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={async () => { await authApi.revokeSession(s.id); await checkSessions(); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>

        <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {isSpanish
            ? "Consejo: Si compartes cuenta, considera usar cuentas separadas. Las sesiones cierran por inactividad y por un tiempo máximo según tu rol."
            : "Tip: If you share an account, consider separate accounts. Sessions close after inactivity and a maximum time, depending on your role."}
        </p>
      </div>
    </Modal>
  );
}
