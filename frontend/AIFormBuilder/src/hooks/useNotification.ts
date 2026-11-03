import { useSyncExternalStore } from "react";
import {
  getNotifications,
  subscribeNotifications,
  notify,
  dismiss,
  clear,
  markAllRead,
} from "../feedback/notificationStore";

export type { AppNotification } from "../feedback/types";

/** Avisos persistentes del store singleton — capa propia en el Toaster.
 *  `notify(n)` sin `duration` → nunca se auto-cierra. */
export function useNotification() {
  const notifications = useSyncExternalStore(
    subscribeNotifications,
    getNotifications,
    getNotifications
  );
  const unread = notifications.filter((n) => !n.read).length;
  return { notifications, unread, notify, dismiss, clear, markAllRead };
}