import {
  Globe,
  AppWindow,
  Cpu,
  Terminal,
  Smartphone,
  Tablet,
  Laptop,
  LogOut,
} from "lucide-react";
import { Card } from "../ui/Card.jsx";
import { Button } from "../ui/Button.jsx";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import {
  useRevokeSession,
  useRevokeOtherSessions,
  useSessions,
} from "../../hooks/useSettings.js";
import { cn } from "../../lib/utils.js";

/**
 * Historial de dispositivos con sesión abierta en la cuenta.
 *
 * Se comparte entre la pestaña «Dispositivos» de Configuración y la página
 * «Seguridad» del menú de identidad: dos entradas al mismo dato, una sola
 * lista, para que no puedan divergir.
 */
export default function SessionsPanel() {
  const { t, language } = useLanguage();
  // Misma clave de caché que invalida el hook al mutar (["settings","sessions"]).
  const { data: sessions = [], isLoading } = useSessions();

  const hasRevocable = sessions.some((s) => s.isActive && !s.isCurrent);

  // Mismo hook, mismo toast: un único camino para cualquier mutación de la cuenta.
  const revoke = useRevokeSession();
  const revokeOthers = useRevokeOtherSessions();

  return (
    <Card className="p-5">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
            <LogOut className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-fg">{t("devicesSectionTitle")}</h3>
            <p className="text-xs text-muted">{t("devicesSectionDesc")}</p>
          </div>
        </div>
        {hasRevocable && (
          <div className="shrink-0">
            <Button
              variant="ghost"
              size="sm"
              loading={revokeOthers.isPending}
              onClick={() => revokeOthers.mutate()}
            >
              <LogOut className="h-3.5 w-3.5" /> {t("closeOthers")}
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <SkeletonLine className="h-14 w-full" />
          <SkeletonLine className="h-14 w-full" />
        </div>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-muted">{t("noSessions")}</p>
      ) : (
        <div className="space-y-2.5">
          {sessions.map((s) => {
            const isCurrent = s.isCurrent;
            const active = s.isActive !== false;
            const DeviceIcon = /mobile|smartphone/i.test(s.device) ? Smartphone : /tablet/i.test(s.device) ? Tablet : Laptop;
            const OsIcon = /windows|mac|darwin|ios/i.test(s.os || "") ? AppWindow : /android|linux/i.test(s.os || "") ? Terminal : Cpu;
            return (
              <div
                key={s.id}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-xl border p-3 transition-colors",
                  isCurrent
                    ? "border-brand-200 bg-brand-50/60 dark:border-brand-800/60 dark:bg-brand-900/15"
                    : active
                      ? "border-default bg-surface dark:border-slate-700"
                      : "border-default bg-surface opacity-60 dark:border-slate-800",
                )}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex shrink-0 items-center gap-1.5" aria-hidden>
                    {[Globe, OsIcon, DeviceIcon].map((ChipIcon, i) => (
                      <span
                        key={i}
                        className={cn(
                          "grid h-8 w-8 place-items-center rounded-lg border",
                          isCurrent
                            ? "border-brand-200 bg-white text-brand-600 dark:border-brand-800 dark:bg-brand-900/40 dark:text-brand-300"
                            : "border-default bg-surface-2 text-muted",
                        )}
                      >
                        <ChipIcon className="h-4 w-4" />
                      </span>
                    ))}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-fg">
                      {s.browser || t("unknownBrowser")} {s.os && `• ${s.os}`} {s.device && `• ${s.device}`}
                      {isCurrent && (
                        <span className="ml-1.5 rounded bg-brand-100 px-1.5 py-0.5 text-[10px] font-bold text-brand-700 dark:bg-brand-900/60 dark:text-brand-200">
                          {t("currentBadge")}
                        </span>
                      )}
                      {!isCurrent && active && (
                        <span className="ml-1.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                          {t("statusActive")}
                        </span>
                      )}
                      {!active && (
                        <span className="ml-1.5 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                          {t("statusClosed")}
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted">
                      IP {s.ip || "—"} · {s.location || t("unknownLocation")} ·{" "}
                      {new Date(s.lastActive).toLocaleString(language === "es" ? "es-ES" : "en-US")}
                    </p>
                  </div>
                </div>
                {active && !isCurrent && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    loading={revoke.isPending}
                    onClick={() => revoke.mutate(s.id)}
                    aria-label={t("sessionClosed")}
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function SkeletonLine({ className }) {
  return <div className={cn("animate-pulse rounded-xl bg-surface-2 dark:bg-slate-800", className)} />;
}
