import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, FilePlus2 } from "lucide-react";
import { PageHeader } from "./Insights.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Button } from "../components/ui/Button.jsx";
import { notificationApi } from "../services/index.js";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { cn } from "../lib/utils.js";
import { builderPath, siteBuilderPath } from "../lib/routes.js";
import { isGuest } from "../lib/roles.js";

const QUERY_KEY = ["notifications-page"];

function formatDate(value, language) {
  return new Intl.DateTimeFormat(language === "es" ? "es-CU" : "en-US", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

/**
 * Centro de notificaciones del panel: la lista completa que la campanita
 * resume. Comparte el mismo endpoint (`notificationApi`) y el mismo destino de
 * un aviso (abre su formulario), sin duplicar la campanita.
 */
export default function Notifications() {
  const { isAuthenticated, user } = useAuth();
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => notificationApi.list(),
    enabled: isAuthenticated,
  });

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;
  const enElSitio = !user || isGuest(user);

  const markAllRead = async () => {
    await notificationApi.markAllRead();
    queryClient.setQueryData(QUERY_KEY, (prev) =>
      prev ? { notifications: prev.notifications.map((item) => ({ ...item, isRead: true })), unreadCount: 0 } : prev,
    );
  };

  const openNotification = async (notification) => {
    if (!notification.isRead) {
      await notificationApi.markRead(notification.id);
      queryClient.setQueryData(QUERY_KEY, (prev) =>
        prev
          ? {
              notifications: prev.notifications.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item)),
              unreadCount: Math.max(0, prev.unreadCount - 1),
            }
          : prev,
      );
    }
    if (notification.formId) {
      window.location.assign(
        enElSitio
          ? siteBuilderPath(notification.formId)
          : builderPath(language, notification.formId, {}, user?.entity?.code)
      );
    }
  };

  return (
    <div className="animate-page-enter mx-auto max-w-3xl px-4 py-8 lg:px-8">
      <PageHeader
        icon={Bell}
        title={t("notifications")}
        subtitle={t("notificationsSubtitle")}
        right={
          unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead}>
              <CheckCheck className="h-4 w-4" /> {t("markAllRead")}
            </Button>
          )
        }
      />

      <Card className="mt-8 overflow-hidden p-0">
        {isLoading ? (
          <div className="space-y-3 p-5" aria-hidden="true">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex gap-3">
                <span className="h-9 w-9 shrink-0 rounded-xl bg-surface-2" />
                <span className="flex-1 space-y-2 py-0.5">
                  <span className="block h-3 w-1/3 rounded-full bg-surface-2" />
                  <span className="block h-2.5 w-2/3 rounded-full bg-surface-2" />
                </span>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-ink-muted">{t("noNotifications")}</p>
        ) : (
          notifications.map((notification) => (
            <button
              key={notification.id}
              onClick={() => openNotification(notification)}
              className={cn(
                "flex w-full gap-3 border-b border-line/60 px-5 py-4 text-left transition-colors last:border-b-0 hover:bg-surface-2/60",
                !notification.isRead && "bg-brand-50/60 dark:bg-brand-900/10"
              )}
            >
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200">
                <FilePlus2 className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">{notification.title}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">{notification.description}</span>
                <span className="mt-1 block text-[10px] text-ink-muted">{formatDate(notification.createdAt, language)}</span>
              </span>
            </button>
          ))
        )}
      </Card>
    </div>
  );
}
