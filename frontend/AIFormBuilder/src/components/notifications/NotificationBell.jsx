import { useEffect, useState } from "react";
import { Bell, CheckCheck, FilePlus2 } from "lucide-react";
import { notificationApi } from "../../services/index.js";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { cn } from "../../lib/utils.js";
import { builderPath, siteBuilderPath } from "../../lib/routes.js";
import { isGuest } from "../../lib/roles.js";

function formatNotificationDate(value, language) {
  return new Intl.DateTimeFormat(language === "es" ? "es-CU" : "en-US", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function NotificationBell() {
  const { isAuthenticated, user } = useAuth();
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  /* El invitado construye en el sitio: su notificación abre
     `/constructor/<id>`, nunca una URL del panel. */
  const enElSitio = !user || isGuest(user);

  const load = async () => {
    if (!isAuthenticated) return;
    try {
      const data = await notificationApi.list();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // La campanita no debe interrumpir el resto del dashboard.
    }
  };

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 15000);
    return () => window.clearInterval(timer);
  }, [isAuthenticated]);

  const markAllRead = async () => {
    await notificationApi.markAllRead();
    setNotifications((items) => items.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
  };

  const openNotification = async (notification) => {
    if (!notification.isRead) {
      await notificationApi.markRead(notification.id);
      setNotifications((items) => items.map((item) => item.id === notification.id ? { ...item, isRead: true } : item));
      setUnreadCount((count) => Math.max(0, count - 1));
    }
    if (notification.formId) {
      window.location.assign(enElSitio ? siteBuilderPath(notification.formId) : builderPath(language, notification.formId, {}, user?.entity?.code));
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        className="relative grid h-11 w-11 place-items-center rounded-2xl border border-transparent text-ink-muted transition-all hover:border-brand-300 hover:bg-surface-2 hover:text-ink"
        aria-label={t("notifications")}
        aria-expanded={open}
      >
        <Bell className="h-[18px] w-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-on-brand-500 ring-2 ring-surface">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-3 top-[4.5rem] z-[var(--z-dropdown)] origin-top overflow-hidden rounded-2xl border border-white/70 bg-white/85 shadow-pop backdrop-blur-2xl animate-scale-in dark:border-white/10 dark:bg-[#141821]/88 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[min(23rem,calc(100vw-2rem))]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/95 to-transparent dark:via-white/20" />
          <div className="flex items-center justify-between border-b border-slate-900/5 px-4 py-3 dark:border-white/5">
            <div>
              <h2 className="text-sm font-semibold text-ink">{t("notifications")}</h2>
              <p className="text-xs text-ink-muted">{unreadCount} {t("unreadNotifications")}</p>
            </div>
            <button onClick={markAllRead} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
              <CheckCheck className="h-3.5 w-3.5" /> {t("markAllRead")}
            </button>
          </div>
          <div className="max-h-[22rem] overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-ink-muted">{t("noNotifications")}</p>
            ) : notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => openNotification(notification)}
                className={cn("flex w-full gap-3 border-b border-slate-900/5 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-slate-900/5 dark:border-white/5 dark:hover:bg-white/5", !notification.isRead && "bg-brand-50/60 dark:bg-brand-900/10")}
              >
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200">
                  <FilePlus2 className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink">{notification.title}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">{notification.description}</span>
                  <span className="mt-1 block text-[10px] text-ink-muted">{formatNotificationDate(notification.createdAt, language)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
