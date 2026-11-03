import { query } from "../config/db.js";

export async function createFormCreatedNotification(userId, form) {
  const source = form.creationSource || "blank";
  const sourceLabel = {
    ai: "Generador de IA",
    template: "plantilla",
    blank: "Nuevo formulario",
  }[source] || "Nuevo formulario";

  await query(
    `INSERT INTO notifications (user_id, form_id, type, source, title, description)
     VALUES ($1, $2, 'form_created', $3, $4, $5)
     ON CONFLICT (form_id) DO NOTHING`,
    [
      userId,
      form._id,
      source,
      `Formulario creado: ${form.title || "Sin título"}`,
      `${form.description || "Sin descripción"} · Vía: ${sourceLabel}`,
    ],
  );
}

export async function listNotifications(userId, limit = 30) {
  const { rows } = await query(
    `SELECT id, form_id, type, source, title, description, is_read, created_at
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit],
  );
  return rows.map((row) => ({
    id: row.id,
    formId: row.form_id,
    type: row.type,
    source: row.source,
    title: row.title,
    description: row.description,
    isRead: row.is_read,
    createdAt: row.created_at,
  }));
}

export async function countUnreadNotifications(userId) {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = false`,
    [userId],
  );
  return rows[0].count;
}

export async function markNotificationRead(userId, notificationId) {
  await query(
    `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2`,
    [notificationId, userId],
  );
}

export async function markAllNotificationsRead(userId) {
  await query(
    `UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false`,
    [userId],
  );
}
